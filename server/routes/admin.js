import { Router } from 'express';
import { HttpError } from '../http.js';
import { listProducts } from '../catalog.js';
import { newId } from '../store.js';
import { requireAdmin } from './auth.js';

const AUDIENCES = ['Women', 'Men', 'Kids'];
const CATEGORIES = ['Dresses', 'Footwear', 'Accessories'];
const TYPES = { Dresses: 'dress', Footwear: 'heels', Accessories: 'bag' };

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const url = (v, label) => {
  const s = str(v);
  if (s && !/^(https:\/\/|\/)/.test(s)) throw new HttpError(400, `${label} must be an https:// URL or a /path`);
  return s || undefined;
};

/** Validates admin product input; `partial` allows updates with only some fields. */
function productInput(body = {}, partial = false) {
  const out = {};
  if (!partial || 'name' in body) {
    out.name = str(body.name);
    if (!out.name) throw new HttpError(400, 'Title is required');
  }
  if (!partial || 'price' in body) {
    out.price = Number(body.price);
    if (!(out.price > 0)) throw new HttpError(400, 'Price must be greater than 0');
  }
  if (!partial || 'stock' in body) {
    out.stock = Math.max(0, Math.floor(Number(body.stock) || 0));
  }
  if (!partial || 'audience' in body) {
    out.audience = AUDIENCES.includes(body.audience) ? body.audience : 'Women';
  }
  if (!partial || 'category' in body) {
    out.category = CATEGORIES.includes(body.category) ? body.category : 'Dresses';
  }
  if ('subCategory' in body) out.subCategory = str(body.subCategory) || undefined;
  if ('image' in body) out.image = url(body.image, 'Image URL');
  if ('tryOnImage' in body) out.tryOnImage = url(body.tryOnImage, 'Flat-lay image URL');
  if ('description' in body) out.description = str(body.description);
  if ('colorName' in body) out.colorName = str(body.colorName);
  if ('color' in body && /^#[0-9a-f]{6}$/i.test(body.color)) out.color = body.color;
  return out;
}

export function adminRoutes(store) {
  const r = Router();
  r.use('/admin', requireAdmin);

  r.get('/admin/stats', (_req, res) => {
    const { users, sessions, offers, orders } = store.data;
    const now = Date.now();
    const activeUsers = new Set(Object.values(sessions).filter((s) => s.role === 'user' && s.exp > now).map((s) => s.userId)).size;
    res.json({
      totalProducts: listProducts(store).length,
      registeredUsers: users.length,
      activeUsers,
      postedOffers: offers.codes.length + offers.banners.length + Object.keys(offers.saleTags).length,
      orders: orders.length,
      revenue: orders.reduce((s, o) => s + o.total, 0),
    });
  });

  r.post('/admin/products', (req, res) => {
    const input = productInput(req.body);
    let id = slug(input.name) || newId('prd');
    if (listProducts(store).some((p) => p.id === id)) id = `${id}-${Date.now().toString(36)}`;
    const product = {
      sizes: input.category === 'Dresses' ? ['XS', 'S', 'M', 'L', 'XL'] : ['One size'],
      rating: 4.5,
      reviews: 0,
      pattern: 'solid',
      color: '#B8954A',
      colorName: 'Signature',
      palette: 'neutral',
      style: 'casual',
      seasons: ['spring', 'summer', 'autumn', 'winter'],
      fabric: 'Premium blend',
      description: '',
      type: TYPES[input.category],
      categories: [input.category],
      imageFit: 'contain',
      imageBg: '#ffffff',
      ...input,
      id,
      custom: true,
    };
    store.update((d) => d.catalog.added.push(product));
    res.status(201).json({ product });
  });

  r.put('/admin/products/:id', (req, res) => {
    const { id } = req.params;
    if (!listProducts(store).some((p) => p.id === id)) throw new HttpError(404, 'Product not found');
    const patch = productInput(req.body, true);
    store.update((d) => {
      const added = d.catalog.added.find((p) => p.id === id);
      if (added) Object.assign(added, patch);
      else d.catalog.updated[id] = { ...d.catalog.updated[id], ...patch };
    });
    res.json({ product: listProducts(store).find((p) => p.id === id) });
  });

  r.delete('/admin/products/:id', (req, res) => {
    const { id } = req.params;
    if (!listProducts(store).some((p) => p.id === id)) throw new HttpError(404, 'Product not found');
    store.update((d) => {
      const before = d.catalog.added.length;
      d.catalog.added = d.catalog.added.filter((p) => p.id !== id);
      if (d.catalog.added.length === before) d.catalog.removed.push(id);
      delete d.catalog.updated[id];
      delete d.offers.saleTags[id];
    });
    res.json({ ok: true });
  });

  r.get('/admin/offers', (_req, res) => res.json(store.data.offers));

  r.post('/admin/offers/codes', (req, res) => {
    const code = str(req.body?.code).toUpperCase().replace(/\s+/g, '');
    const percent = Math.round(Number(req.body?.percent));
    if (!/^[A-Z0-9]{3,20}$/.test(code)) throw new HttpError(400, 'Code must be 3–20 letters or digits');
    if (!(percent >= 1 && percent <= 90)) throw new HttpError(400, 'Discount must be between 1% and 90%');
    if (store.data.offers.codes.some((c) => c.code === code)) throw new HttpError(409, 'That code already exists');
    const entry = { code, percent, active: true, createdAt: new Date().toISOString() };
    store.update((d) => d.offers.codes.push(entry));
    res.status(201).json({ code: entry });
  });

  r.delete('/admin/offers/codes/:code', (req, res) => {
    store.update((d) => {
      d.offers.codes = d.offers.codes.filter((c) => c.code !== req.params.code);
    });
    res.json({ ok: true });
  });

  r.post('/admin/offers/banners', (req, res) => {
    const text = str(req.body?.text);
    if (!text || text.length > 140) throw new HttpError(400, 'Banner text must be 1–140 characters');
    const banner = { id: newId('bnr'), text, active: true };
    store.update((d) => d.offers.banners.push(banner));
    res.status(201).json({ banner });
  });

  r.delete('/admin/offers/banners/:id', (req, res) => {
    store.update((d) => {
      d.offers.banners = d.offers.banners.filter((b) => b.id !== req.params.id);
    });
    res.json({ ok: true });
  });

  r.put('/admin/offers/sale-tags/:id', (req, res) => {
    const { id } = req.params;
    if (!listProducts(store).some((p) => p.id === id)) throw new HttpError(404, 'Product not found');
    const label = str(req.body?.label).slice(0, 24);
    store.update((d) => {
      if (label) d.offers.saleTags[id] = label;
      else delete d.offers.saleTags[id];
    });
    res.json({ ok: true });
  });

  return r;
}
