import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app.js';
import { getConfig } from '../config.js';

const app = createApp(getConfig({ TRYON_PROVIDER: 'mock', DATA_FILE: '' }));

test('signup, login, me and logout', async () => {
  await request(app).post('/api/auth/signup').send({ name: 'Ria', email: 'bad', password: 'secret1' }).expect(400);
  const { body } = await request(app).post('/api/auth/signup').send({ name: 'Ria', email: 'Ria@Example.com', password: 'secret1' }).expect(201);
  assert.equal(body.user.email, 'ria@example.com');
  assert.equal(body.user.wallet, 50);
  assert.equal(body.user.hash, undefined);
  await request(app).post('/api/auth/signup').send({ name: 'Ria', email: 'ria@example.com', password: 'secret1' }).expect(409);
  await request(app).post('/api/auth/login').send({ email: 'ria@example.com', password: 'wrong!' }).expect(401);
  const login = await request(app).post('/api/auth/login').send({ email: 'ria@example.com', password: 'secret1' }).expect(200);
  const auth = `Bearer ${login.body.token}`;
  const me = await request(app).get('/api/auth/me').set('Authorization', auth).expect(200);
  assert.equal(me.body.user.name, 'Ria');
  await request(app).post('/api/auth/logout').set('Authorization', auth).expect(200);
  await request(app).get('/api/auth/me').set('Authorization', auth).expect(401);
});

test('guests cannot run a try-on', async () => {
  const res = await request(app).post('/api/try-on').field('productId', 'emerald-wrap-midi').expect(401);
  assert.match(res.body.error, /log in/);
});

test('admin manages products and offers; users cannot', async () => {
  const user = await request(app).post('/api/auth/signup').send({ name: 'U', email: 'u@example.com', password: 'secret1' });
  await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${user.body.token}`).expect(401);
  await request(app).post('/api/admin/login').send({ email: 'admin@fitstyle.ai', password: 'nope' }).expect(401);
  const { body } = await request(app).post('/api/admin/login').send({ email: 'admin@fitstyle.ai', password: 'admin123' }).expect(200);
  const admin = `Bearer ${body.token}`;
  const before = (await request(app).get('/api/products')).body.products.length;

  const created = await request(app).post('/api/admin/products').set('Authorization', admin)
    .send({ name: 'Test Kurta', price: 49, category: 'Dresses', audience: 'Men', subCategory: 'Ethnic', stock: 7, image: '/images/x.jpg' })
    .expect(201);
  const id = created.body.product.id;
  await request(app).put(`/api/admin/products/${id}`).set('Authorization', admin).send({ price: 59 }).expect(200);
  await request(app).put('/api/admin/products/noir-column-gown').set('Authorization', admin).send({ stock: 3 }).expect(200);
  let products = (await request(app).get('/api/products')).body.products;
  assert.equal(products.length, before + 1);
  assert.equal(products.find((p) => p.id === id).price, 59);
  assert.equal(products.find((p) => p.id === 'noir-column-gown').stock, 3);

  await request(app).post('/api/admin/offers/codes').set('Authorization', admin).send({ code: 'fest20', percent: 20 }).expect(201);
  await request(app).post('/api/admin/offers/banners').set('Authorization', admin).send({ text: 'Festive sale!' }).expect(201);
  await request(app).put('/api/admin/offers/sale-tags/noir-column-gown').set('Authorization', admin).send({ label: '20% OFF' }).expect(200);
  const v = await request(app).post('/api/offers/validate').send({ code: 'FEST20' }).expect(200);
  assert.equal(v.body.percent, 20);
  const offers = (await request(app).get('/api/offers')).body;
  assert.equal(offers.banners[0].text, 'Festive sale!');
  products = (await request(app).get('/api/products')).body.products;
  assert.equal(products.find((p) => p.id === 'noir-column-gown').saleTag, '20% OFF');

  await request(app).delete(`/api/admin/products/${id}`).set('Authorization', admin).expect(200);
  await request(app).delete('/api/admin/products/noir-column-gown').set('Authorization', admin).expect(200);
  assert.equal((await request(app).get('/api/products')).body.products.length, before - 1);
  const stats = (await request(app).get('/api/admin/stats').set('Authorization', admin)).body;
  assert.equal(stats.totalProducts, before - 1);
  assert.ok(stats.activeUsers >= 1);
  assert.equal(stats.postedOffers, 2);
});

test('personal-photo try-on is refused for intimate wear', async () => {
  const user = await request(app).post('/api/auth/signup').send({ name: 'I', email: 'intimates@example.com', password: 'secret1' }).expect(201);
  const res = await request(app)
    .post('/api/try-on')
    .set('Authorization', `Bearer ${user.body.token}`)
    .field('productId', 'blush-lace-bralette')
    .expect(403);
  assert.match(res.body.error, /disabled for intimate wear/);
});

test('cross-category pairings and optional layered try-on', async () => {
  const { pairingsFor } = await import('../../shared/pairing.js');
  const { PRODUCTS } = await import('../../shared/products.js');
  const get = (id) => PRODUCTS.find((p) => p.id === id);
  const cats = (id) => pairingsFor(get(id), PRODUCTS).map((g) => g.category);
  assert.deepEqual(cats('scarlet-cocktail'), ['Footwear', 'Accessories']);
  assert.deepEqual(cats('gilded-stiletto-pumps'), ['Dresses', 'Accessories']);
  assert.deepEqual(cats('gold-chain-clutch'), ['Dresses', 'Footwear']);
  const groups = pairingsFor(get('scarlet-cocktail'), PRODUCTS);
  for (const g of groups) {
    assert.ok(g.items.length > 0);
    assert.ok(g.items.every(({ product }) => product.audience === 'Women'));
  }
  assert.deepEqual(pairingsFor(get('blush-lace-bralette'), PRODUCTS), []);

  const sharp = (await import('sharp')).default;
  const look = await sharp({ create: { width: 300, height: 400, channels: 3, background: '#cccccc' } }).jpeg().toBuffer();
  const image = `data:image/jpeg;base64,${look.toString('base64')}`;
  await request(app).post('/api/try-on/layer').send({ productId: 'gold-chain-clutch', image }).expect(401);
  const user = await request(app).post('/api/auth/signup').send({ name: 'L', email: 'layer@example.com', password: 'secret1' }).expect(201);
  const auth = `Bearer ${user.body.token}`;
  const res = await request(app).post('/api/try-on/layer').set('Authorization', auth).send({ productId: 'gold-chain-clutch', image }).expect(200);
  assert.match(res.body.image, /^data:image\//);
  assert.equal(res.body.provider, 'mock');
  await request(app).post('/api/try-on/layer').set('Authorization', auth).send({ productId: 'noir-modal-briefs', image }).expect(403);
});

test('delivery check, quotes and checkout with wallet, codes and payment methods', async () => {
  const ok = await request(app).get('/api/delivery/600001').expect(200);
  assert.equal(ok.body.message, 'Delivering to 600001 in 2-3 business days');
  assert.equal((await request(app).get('/api/delivery/12345').expect(200)).body.ok, false);
  assert.equal((await request(app).get('/api/delivery/900001').expect(200)).body.ok, false);

  const admin = await request(app).post('/api/admin/login').send({ email: 'admin@fitstyle.ai', password: 'admin123' }).expect(200);
  await request(app).post('/api/admin/offers/codes').set('Authorization', `Bearer ${admin.body.token}`).send({ code: 'SAVE10', percent: 10 }).expect(201);

  const user = await request(app).post('/api/auth/signup').send({ name: 'Buyer', email: 'buyer@example.com', password: 'secret1' }).expect(201);
  const auth = `Bearer ${user.body.token}`;
  const items = [{ id: 'scarlet-block-heels', qty: 1, size: '7' }];
  await request(app).post('/api/orders/quote').send({ items }).expect(401);
  const q = await request(app).post('/api/orders/quote').set('Authorization', auth).send({ items, code: 'save10', useWallet: true }).expect(200);
  assert.deepEqual(q.body.totals, { subtotal: 120, discount: 12, delivery: 12, tax: 8.64, total: 128.64, walletApplied: 50, payable: 78.64 });

  const address = { name: 'Buyer', phone: '9876543210', line: '1 Anna Salai', city: 'Chennai' };
  const base = { items, code: 'SAVE10', useWallet: true, pincode: '600001', address };
  await request(app).post('/api/orders').set('Authorization', auth).send({ ...base, paymentMethod: 'wallet' }).expect(400);
  await request(app).post('/api/orders').set('Authorization', auth).send({ ...base, pincode: '900001', paymentMethod: 'cod' }).expect(400);
  await request(app).post('/api/orders').set('Authorization', auth).send({ ...base, paymentMethod: 'upi', upiApp: 'PhonePe', upiId: 'bad' }).expect(400);
  const placed = await request(app).post('/api/orders').set('Authorization', auth).send({ ...base, paymentMethod: 'upi', upiApp: 'PhonePe', upiId: 'buyer@ybl' }).expect(201);
  assert.equal(placed.body.user.wallet, 0);
  assert.equal(placed.body.order.payment.app, 'PhonePe');
  assert.equal(placed.body.order.total, 128.64);

  const cod = await request(app).post('/api/orders').set('Authorization', auth).send({ items, pincode: '560001', address, paymentMethod: 'cod' }).expect(201);
  assert.equal(cod.body.order.payment.status, 'Pay on delivery');
  const mine = await request(app).get('/api/orders').set('Authorization', auth).expect(200);
  assert.equal(mine.body.orders.length, 2);
  const stock = (await request(app).get('/api/products/scarlet-block-heels')).body.product.stock;
  assert.equal(stock, 23);
  const stats = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${admin.body.token}`).expect(200);
  assert.ok(stats.body.orders >= 2);
});
