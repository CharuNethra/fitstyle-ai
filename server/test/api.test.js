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
const app = createApp(getConfig({}));

test('health reports mock providers when no keys are configured', async () => {
  const res = await request(app).get('/api/health').expect(200);
  assert.deepEqual(res.body.providers, { tryOn: 'mock', vision: 'mock' });
});

test('config picks real providers when keys are present', () => {
  const c = getConfig({ FAL_KEY: 'x', GEMINI_API_KEY: 'y' });
  assert.equal(c.tryOnProvider, 'fal');
  assert.equal(c.visionProvider, 'gemini');
});

test('products endpoint lists the catalogue', async () => {
  const res = await request(app).get('/api/products').expect(200);
  assert.ok(res.body.products.length >= 20);
});

let tryOnImage;

test('try-on composites the garment onto an uploaded photo', async () => {
  const res = await request(app)
    .post('/api/try-on')
    .field('productId', 'emerald-wrap-midi')
    .attach('photo', samplePhoto, { filename: 'me.svg', contentType: 'image/svg+xml' })
    .expect(200);
  assert.equal(res.body.provider, 'mock');
  assert.match(res.body.image, /^data:image\/jpeg;base64,/);
  assert.equal(res.body.detected, true);
  tryOnImage = res.body.image;
});

test('try-on validates input', async () => {
  await request(app).post('/api/try-on').field('productId', 'emerald-wrap-midi').expect(400);
  await request(app)
    .post('/api/try-on')
    .field('productId', 'nope')
    .attach('photo', samplePhoto, { filename: 'me.svg', contentType: 'image/svg+xml' })
    .expect(404);
  await request(app)
    .post('/api/try-on')
    .field('productId', 'emerald-wrap-midi')
    .attach('photo', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' })
    .expect(415);
  await request(app)
    .post('/api/try-on')
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
