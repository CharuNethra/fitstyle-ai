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
const app = createApp(getConfig({ TRYON_PROVIDER: 'mock', DATA_FILE: '' }));
const { body: signup } = await request(app).post('/api/auth/signup').send({ name: 'Ava', email: 'ava@example.com', password: 'secret1' });
const AUTH = `Bearer ${signup.token}`;

test('health reports mock providers when no keys are configured', async () => {
  const res = await request(app).get('/api/health').expect(200);
  assert.deepEqual(res.body.providers, { tryOn: 'mock', vision: 'mock' });
});

test('config picks Gemini try-on and vision when keyed, Hugging Face otherwise', () => {
  const c = getConfig({ FAL_KEY: 'x', GEMINI_API_KEY: 'y' });
  assert.equal(c.tryOnProvider, 'gemini');
  assert.equal(c.geminiImageModel, 'gemini-3.1-flash-image');
  assert.equal(getConfig({}).tryOnProvider, 'huggingface');
  assert.deepEqual(c.hfSpaces, ['yisol/IDM-VTON', 'Nymbo/Virtual-Try-On']);
  assert.equal(c.visionProvider, 'gemini');
  assert.equal(getConfig({ TRYON_PROVIDER: 'fal' }).tryOnProvider, 'fal');
  assert.equal(getConfig({ GEMINI_API_KEY: 'k', TRYON_PROVIDER: 'huggingface' }).tryOnProvider, 'huggingface');
});

test('products endpoint lists the catalogue', async () => {
  const res = await request(app).get('/api/products').expect(200);
  assert.ok(res.body.products.length >= 20);
});

let tryOnImage;

test('try-on composites the garment onto an uploaded photo', async () => {
  const res = await request(app)
    .post('/api/try-on').set('Authorization', AUTH)
    .field('productId', 'emerald-wrap-midi')
    .attach('photo', samplePhoto, { filename: 'me.svg', contentType: 'image/svg+xml' })
    .expect(200);
  assert.equal(res.body.provider, 'mock');
  assert.match(res.body.image, /^data:image\/jpeg;base64,/);
  assert.equal(res.body.detected, true);
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

test('when every AI provider fails, try-on returns a retryable 503 instead of a fake composite', async () => {
  const offline = createApp(getConfig({ TRYON_PROVIDER: 'huggingface', HF_TRYON_SPACES: ' ', HF_DRESS_SPACE: '', DATA_FILE: '' }));
  const user = await request(offline).post('/api/auth/signup').send({ name: 'O', email: 'o@example.com', password: 'secret1' });
  const res = await request(offline)
    .post('/api/try-on').set('Authorization', `Bearer ${user.body.token}`)
    .field('productId', 'aurelia-satin-slip')
    .attach('photo', samplePhoto, { filename: 'me.svg', contentType: 'image/svg+xml' })
    .expect(503);
  assert.equal(res.body.retryable, true);
  assert.match(res.body.error, /try again/);
  assert.equal(res.body.image, undefined);
});

test('provider chain falls back to Hugging Face and never to the mock', async () => {
  const { providerChain } = await import('../services/tryOn.js');
  assert.deepEqual(providerChain(getConfig({ GEMINI_API_KEY: 'k' })), ['gemini', 'huggingface']);
  assert.deepEqual(providerChain(getConfig({})), ['huggingface']);
  assert.deepEqual(providerChain(getConfig({ TRYON_PROVIDER: 'huggingface', GEMINI_API_KEY: 'k' })), ['huggingface', 'gemini']);
  assert.deepEqual(providerChain(getConfig({ TRYON_PROVIDER: 'mock' })), ['mock']);
});
