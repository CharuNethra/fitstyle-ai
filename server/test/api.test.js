import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { createApp } from '../app.js';
import { getConfig } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const samplePhoto = fs.readFileSync(path.resolve(__dirname, '../../public/samples/sample-model.svg'));
// Stub for the Gemini image API so try-on tests run offline: 'ok' returns an image, 'busy' a 429.
const realFetch = globalThis.fetch;
const gemini = { mode: 'ok', calls: 0 };
const sharp = (await import('sharp')).default;
const fakeImage = (await sharp({ create: { width: 768, height: 1024, channels: 3, background: '#b76e79' } }).jpeg().toBuffer()).toString('base64');
globalThis.fetch = async (url, opts) => {
  if (!String(url).includes('generativelanguage.googleapis.com')) return realFetch(url, opts);
  gemini.calls += 1;
  if (gemini.mode === 'busy') return new Response('{"error":{"code":429,"message":"quota"}}', { status: 429 });
  if (gemini.mode === 'billing') return new Response('{"error":{"code":403,"message":"Your billing account has an outstanding balance."}}', { status: 403 });
  if (gemini.mode === 'free-tier') return new Response('{"error":{"code":429,"message":"Quota exceeded for metric: generate_content_free_tier_requests, limit: 0"}}', { status: 429 });
  return Response.json({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: fakeImage } }] } }] });
};

const app = createApp(getConfig({ DATA_FILE: '' }));
const geminiApp = createApp(getConfig({ DATA_FILE: '', GEMINI_API_KEY: 'test-key' }));
const signupIn = async (a) => `Bearer ${(await request(a).post('/api/auth/signup').send({ name: 'Ava', email: 'ava@example.com', password: 'secret1' })).body.token}`;
const AUTH = await signupIn(app);
const GEMINI_AUTH = await signupIn(geminiApp);

test('health reports try-on as not configured without a Gemini key', async () => {
  const res = await request(app).get('/api/health').expect(200);
  assert.deepEqual(res.body.providers, { tryOn: 'not configured', vision: 'mock' });
  assert.equal((await request(geminiApp).get('/api/health')).body.providers.tryOn, 'gemini');
});

test('config uses Gemini for vision when keyed', () => {
  const c = getConfig({ GEMINI_API_KEY: 'y' });
  assert.equal(c.geminiImageModel, 'gemini-3.1-flash-image');
  assert.equal(c.visionProvider, 'gemini');
  assert.equal(getConfig({}).visionProvider, 'mock');
});

test('products endpoint lists the catalogue', async () => {
  const res = await request(app).get('/api/products').expect(200);
  assert.ok(res.body.products.length >= 20);
});

let tryOnImage;

test('try-on returns the Gemini image for an uploaded photo', async () => {
  gemini.mode = 'ok';
  const res = await request(geminiApp)
    .post('/api/try-on').set('Authorization', GEMINI_AUTH)
    .field('productId', 'aurelia-satin-slip')
    .attach('photo', samplePhoto, { filename: 'me.svg', contentType: 'image/svg+xml' })
    .expect(200);
  assert.equal(res.body.provider, 'gemini');
  assert.equal(res.body.model, 'gemini-3.1-flash-image');
  assert.match(res.body.image, /^data:image\/jpeg;base64,/);
  tryOnImage = res.body.image;
});

test('try-on validates input', async () => {
  await request(app).post('/api/try-on').set('Authorization', AUTH).field('productId', 'emerald-wrap-midi').expect(400);
  await request(app)
    .post('/api/try-on').set('Authorization', AUTH)
    .field('productId', 'nope')
    .attach('photo', samplePhoto, { filename: 'me.svg', contentType: 'image/svg+xml' })
    .expect(404);
  await request(app)
    .post('/api/try-on').set('Authorization', AUTH)
    .field('productId', 'emerald-wrap-midi')
    .attach('photo', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' })
    .expect(415);
  await request(app)
    .post('/api/try-on').set('Authorization', AUTH)
    .field('productId', 'emerald-wrap-midi')
    .attach('photo', Buffer.from('not really a png'), { filename: 'a.png', contentType: 'image/png' })
    .expect(422);
});

test('calculate-match returns a score and 5-part breakdown', async () => {
  const res = await request(app)
    .post('/api/calculate-match')
    .send({ productId: 'emerald-wrap-midi', image: tryOnImage })
    .expect(200);
  assert.ok(res.body.score >= 50 && res.body.score <= 100);
  assert.match(res.body.headline, /% Match for your/);
  assert.equal(res.body.breakdown.length, 5);
  await request(app).post('/api/calculate-match').send({ productId: 'emerald-wrap-midi' }).expect(400);
});

test('styling-suggestions returns hairstyles, accessories and footwear', async () => {
  const res = await request(app)
    .post('/api/styling-suggestions')
    .send({ productId: 'noir-column-gown', image: tryOnImage })
    .expect(200);
  for (const key of ['hairstyles', 'accessories', 'footwear']) {
    assert.equal(res.body[key].length, 3);
    assert.ok(res.body[key][0].name);
  }
});

test('styling-suggestions with rules: true uses the rule engine without calling Gemini', async () => {
  gemini.calls = 0;
  const res = await request(geminiApp).post('/api/styling-suggestions').send({ productId: 'pastel-bridal-lehenga', rules: true }).expect(200);
  assert.equal(res.body.provider, 'mock');
  for (const key of ['hairstyles', 'accessories', 'footwear']) assert.equal(res.body[key].length, 3);
  assert.ok(res.body.notes.some((n) => n.startsWith('Bridal:')));
  assert.equal(gemini.calls, 0);
});

test('recommendations require consent and reflect history', async () => {
  await request(app).post('/api/recommendations').send({ wishlist: ['noir-column-gown'] }).expect(403);
  const res = await request(app)
    .post('/api/recommendations')
    .send({ consent: true, wishlist: ['noir-column-gown'], cart: ['scarlet-cocktail'], searches: ['satin'] })
    .expect(200);
  assert.equal(res.body.personalized, true);
  assert.ok(res.body.items.length > 0);
  assert.ok(res.body.items.every((i) => i.reason && i.matchPercent));
  const ids = res.body.items.slice(0, 3).map((i) => i.productId);
  assert.ok(ids.some((id) => ['aurelia-satin-slip', 'cobalt-satin-midi', 'blush-tulle-gown'].includes(id)), ids.join());
});

test('unknown api routes 404 as JSON', async () => {
  const res = await request(app).get('/api/nope').expect(404);
  assert.equal(res.body.error, 'Not found');
});

test('when Gemini is busy after a retry, try-on returns the text-only busy message and no image', async () => {
  gemini.mode = 'busy';
  gemini.calls = 0;
  const res = await request(geminiApp)
    .post('/api/try-on').set('Authorization', GEMINI_AUTH)
    .field('productId', 'aurelia-satin-slip')
    .attach('photo', samplePhoto, { filename: 'me.svg', contentType: 'image/svg+xml' })
    .expect(503);
  assert.deepEqual(res.body, { error: 'Our Try-on is busy right now, try again later', retryable: true });
  assert.equal(gemini.calls, 6, 'three Gemini image models, each tried twice');
  gemini.mode = 'ok';
});

test('health/ai reports whether the Gemini key works, without exposing it', async () => {
  assert.deepEqual((await request(app).get('/api/health/ai')).body, { gemini: { ok: false, reason: 'GEMINI_API_KEY is not set' } });
  gemini.mode = 'billing';
  const res = await request(geminiApp).get('/api/health/ai').expect(200);
  assert.equal(res.body.gemini.status, 403);
  assert.match(res.body.gemini.reason, /billing/);
  assert.doesNotMatch(JSON.stringify(res.body), /test-key/);
  gemini.mode = 'ok';
  assert.equal((await request(geminiApp).get('/api/health/ai')).body.gemini.ok, true);
});

test('billing and free-tier image errors fail fast with the busy message', async () => {
  for (const mode of ['billing', 'free-tier']) {
    gemini.mode = mode;
    gemini.calls = 0;
    const res = await request(geminiApp)
      .post('/api/try-on').set('Authorization', GEMINI_AUTH)
      .field('productId', 'aurelia-satin-slip')
      .attach('photo', samplePhoto, { filename: 'me.svg', contentType: 'image/svg+xml' })
      .expect(503);
    assert.deepEqual(res.body, { error: 'Our Try-on is busy right now, try again later', retryable: true });
    assert.equal(gemini.calls, 1, `${mode}: no pointless retries`);
  }
  gemini.mode = 'ok';
});

test('without a Gemini key, try-on and layering return the busy message', async () => {
  const res = await request(app)
    .post('/api/try-on').set('Authorization', AUTH)
    .field('productId', 'aurelia-satin-slip')
    .attach('photo', samplePhoto, { filename: 'me.svg', contentType: 'image/svg+xml' })
    .expect(503);
  assert.equal(res.body.error, 'Our Try-on is busy right now, try again later');
  assert.equal(res.body.image, undefined);
  const layer = await request(app).post('/api/try-on/layer').set('Authorization', AUTH).send({ productId: 'gold-chain-clutch', image: tryOnImage }).expect(503);
  assert.equal(layer.body.image, undefined);
});

test('layering adds footwear/accessories through Gemini', async () => {
  const res = await request(geminiApp).post('/api/try-on/layer').set('Authorization', GEMINI_AUTH).send({ productId: 'gold-chain-clutch', image: tryOnImage }).expect(200);
  assert.equal(res.body.provider, 'gemini');
  assert.match(res.body.image, /^data:image\/jpeg;base64,/);
});
