import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../app.js';
import { getConfig } from '../config.js';
import { createStore, upstashRedis } from '../store.js';

const DAY = 864e5;
const config = getConfig({ DATA_FILE: '' });

/** Stand-in for Redis shared by several "serverless instances". */
function fakeRedis() {
  const db = { value: null, sets: 0 };
  return { db, get: async () => db.value, set: async (v) => { db.value = v; db.sets += 1; return 'OK'; } };
}

test('accounts and sessions are shared across serverless instances via Redis', async () => {
  const redis = fakeRedis();
  const a = createApp(config, createStore(null, redis));
  const b = createApp(config, createStore(null, redis));

  const signup = await request(a).post('/api/auth/signup').send({ name: 'Mira', email: 'Mira@Example.com', password: 'secret1' }).expect(201);
  const me = await request(b).get('/api/auth/me').set('Authorization', `Bearer ${signup.body.token}`).expect(200);
  assert.equal(me.body.user.email, 'mira@example.com');

  const login = await request(b).post('/api/auth/login').send({ email: 'mira@example.com', password: 'secret1' }).expect(200);
  await request(a).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`).expect(200);
  await request(a).post('/api/auth/login').send({ email: 'mira@example.com', password: 'nope11' }).expect(401);

  const saved = JSON.parse(redis.db.value);
  assert.equal(saved.users.length, 1);
  assert.equal(saved.users[0].password, undefined);
  assert.match(saved.users[0].hash, /^[a-f0-9]{128}$/);
  assert.ok(saved.sessions[login.body.token].exp - Date.now() > 29 * DAY);
});

test('simultaneous sign-ups on different instances are both kept', async () => {
  const redis = fakeRedis();
  const a = createApp(config, createStore(null, redis));
  const b = createApp(config, createStore(null, redis));
  await Promise.all([
    request(a).post('/api/auth/signup').send({ name: 'A', email: 'a@example.com', password: 'secret1' }).expect(201),
    request(b).post('/api/auth/signup').send({ name: 'B', email: 'b@example.com', password: 'secret1' }).expect(201),
  ]);
  const fresh = createApp(config, createStore(null, redis));
  for (const email of ['a@example.com', 'b@example.com']) {
    await request(fresh).post('/api/auth/login').send({ email, password: 'secret1' }).expect(200);
  }
});

test('requests that change nothing do not write to Redis', async () => {
  const redis = fakeRedis();
  const app = createApp(config, createStore(null, redis));
  await request(app).get('/api/products').expect(200);
  await request(app).get('/api/health').expect(200);
  assert.equal(redis.db.sets, 0);
});

test('a Redis outage returns a clean 500 instead of crashing', async () => {
  const app = createApp(config, createStore(null, { get: async () => { throw new Error('down'); }, set: async () => 'OK' }));
  const res = await request(app).post('/api/auth/login').send({ email: 'x@example.com', password: 'secret1' }).expect(500);
  assert.equal(res.body.error, 'Something went wrong. Please try again.');
});

test('file storage keeps accounts and sessions across a server restart', async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fitstyle-')), 'db.json');
  const first = createApp(config, createStore(file));
  const { body } = await request(first).post('/api/auth/signup').send({ name: 'Ola', email: 'ola@example.com', password: 'secret1' }).expect(201);
  const restarted = createApp(config, createStore(file));
  await request(restarted).get('/api/auth/me').set('Authorization', `Bearer ${body.token}`).expect(200);
  await request(restarted).post('/api/auth/login').send({ email: 'ola@example.com', password: 'secret1' }).expect(200);
});

test('sessions last 30 days and expire after that', async () => {
  const store = createStore('');
  const app = createApp(config, store);
  const { body } = await request(app).post('/api/auth/signup').send({ name: 'T', email: 't@example.com', password: 'secret1' }).expect(201);
  const session = store.data.sessions[body.token];
  assert.ok(session.exp - Date.now() > 29 * DAY);
  session.exp = Date.now() - 1;
  await request(app).get('/api/auth/me').set('Authorization', `Bearer ${body.token}`).expect(401);
});

test('Redis is used when the Vercel/Upstash env vars are set, and health reports the storage', async () => {
  assert.equal(getConfig({ KV_REST_API_URL: 'https://x.upstash.io', KV_REST_API_TOKEN: 't' }).redisUrl, 'https://x.upstash.io');
  assert.equal(getConfig({ UPSTASH_REDIS_REST_URL: 'https://y.upstash.io', UPSTASH_REDIS_REST_TOKEN: 't' }).redisToken, 't');
  const res = await request(createApp(config, createStore(null, fakeRedis()))).get('/api/health').expect(200);
  assert.equal(res.body.storage, 'redis');
});

test('upstashRedis speaks the Upstash REST protocol', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, auth: init.headers.Authorization, cmd: JSON.parse(init.body) });
    return new Response(JSON.stringify({ result: calls.length === 1 ? 'OK' : '{"users":[]}' }), { status: 200 });
  });
  const redis = upstashRedis('https://x.upstash.io', 'tok', 'k');
  await redis.set('{"users":[]}');
  assert.equal(await redis.get(), '{"users":[]}');
  assert.deepEqual(calls.map((c) => c.cmd), [['SET', 'k', '{"users":[]}'], ['GET', 'k']]);
  assert.equal(calls[0].auth, 'Bearer tok');
});
