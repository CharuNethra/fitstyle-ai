import express from 'express';
import { HttpError } from '../http.js';
import { findProduct } from '../catalog.js';
import { requireUser, publicUser } from './auth.js';
import { PAYMENT_METHODS, UPI_APPS, checkPincode, priceOrder } from '../../shared/checkout.js';

const round = (n) => Math.round(n * 100) / 100;

export function orderRoutes(store) {
  const r = express.Router();

  const quote = (body, user) => {
    const items = Array.isArray(body?.items) ? body.items.slice(0, 50) : [];
    if (!items.length) throw new HttpError(400, 'Your bag is empty');
    const lines = items.map((i) => {
      const p = findProduct(store, i?.id);
      if (!p) throw new HttpError(400, `Unknown product: ${i?.id}`);
      const qty = Math.max(1, Math.min(10, parseInt(i.qty, 10) || 1));
      if (typeof p.stock === 'number' && p.stock < qty) throw new HttpError(409, `${p.name} has only ${p.stock} left in stock`);
      return { id: p.id, name: p.name, price: p.price, qty, size: String(i.size || '') };
    });
    let code = null;
    let percent = 0;
    if (body.code) {
      const offer = store.data.offers.codes.find((c) => c.code === String(body.code).trim().toUpperCase() && c.active);
      if (!offer) throw new HttpError(400, 'That code is invalid or has expired');
      ({ code, percent } = offer);
    }
    const useWallet = Boolean(body.useWallet) || body.paymentMethod === 'wallet';
    return { lines, code, percent, totals: priceOrder({ lines, percent, wallet: user.wallet || 0, useWallet }) };
  };

  function payment(body, payable) {
    const method = body.paymentMethod;
    if (!PAYMENT_METHODS.includes(method)) throw new HttpError(400, 'Choose a payment method');
    if (payable <= 0) return { method: 'wallet', status: 'Paid' };
    if (method === 'wallet') throw new HttpError(400, 'Your wallet balance does not cover this order. Choose another method for the rest.');
    if (method === 'cod') return { method, status: 'Pay on delivery' };
    if (method === 'upi') {
      if (!UPI_APPS.includes(body.upiApp)) throw new HttpError(400, 'Choose Google Pay, PhonePe or Paytm');
      if (!/^[\w.-]{2,}@[a-z]{2,}$/i.test(body.upiId || '')) throw new HttpError(400, 'Enter a valid UPI ID (e.g. name@okaxis)');
      return { method, app: body.upiApp, status: 'Paid' };
    }
    const card = String(body.card?.number || '').replace(/\D/g, '');
    if (card.length < 12 || card.length > 19) throw new HttpError(400, 'Enter a valid card number');
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(body.card?.expiry || '')) throw new HttpError(400, 'Card expiry must be MM/YY');
    if (!/^\d{3,4}$/.test(body.card?.cvc || '')) throw new HttpError(400, 'Card CVC must be 3–4 digits');
    return { method, last4: card.slice(-4), status: 'Paid' };
  }

  r.post('/orders/quote', requireUser, (req, res) => {
    res.json({ ...quote(req.body, req.user), wallet: req.user.wallet || 0 });
  });

  r.post('/orders', requireUser, (req, res) => {
    const delivery = checkPincode(req.body?.pincode);
    if (!delivery.ok) throw new HttpError(400, delivery.message);
    const a = req.body?.address || {};
    if (!a.name?.trim() || !a.line?.trim() || !a.city?.trim()) throw new HttpError(400, 'Name, address and city are required');
    if (!/^\d{10}$/.test(String(a.phone || '').replace(/\D/g, ''))) throw new HttpError(400, 'Enter a 10-digit phone number');
    const q = quote(req.body, req.user);
    const pay = payment(req.body, q.totals.payable);
    const order = {
      id: `FS-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      userId: req.user.id,
      items: q.lines,
      code: q.code,
      totals: q.totals,
      total: q.totals.total,
      payment: { ...pay, walletApplied: q.totals.walletApplied },
      pincode: delivery.pincode,
      eta: delivery.eta,
      etaText: delivery.etaText,
      address: { name: a.name.trim(), phone: String(a.phone).replace(/\D/g, ''), line: a.line.trim(), city: a.city.trim() },
      status: 'Placed',
      createdAt: new Date().toISOString(),
    };
    let user;
    store.update((d) => {
      user = d.users.find((u) => u.id === req.user.id);
      user.wallet = round((user.wallet || 0) - q.totals.walletApplied);
      d.orders.push(order);
      for (const line of q.lines) {
        const p = findProduct(store, line.id);
        if (typeof p.stock === 'number') d.catalog.updated[line.id] = { ...d.catalog.updated[line.id], stock: Math.max(0, p.stock - line.qty) };
      }
    });
    res.status(201).json({ order, user: publicUser(user) });
  });

  r.get('/orders', requireUser, (req, res) => {
    res.json({ orders: store.data.orders.filter((o) => o.userId === req.user.id).reverse() });
  });

  return r;
}
