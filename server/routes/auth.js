import crypto from 'node:crypto';
import { Router } from 'express';
import { HttpError } from '../http.js';
import { hashPassword, newId, newToken, verifyPassword } from '../store.js';

const SESSION_DAYS = 30;
export const SIGNUP_WALLET_BONUS = 50;

export const publicUser = (u) => u && { id: u.id, name: u.name, email: u.email, role: u.role, wallet: u.wallet };

/** Resolves `Authorization: Bearer <token>` to req.user / req.role. */
export function authenticate(store, config) {
  return (req, _res, next) => {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const session = token && store.data.sessions[token];
    if (session && session.exp > Date.now()) {
      req.token = token;
      req.role = session.role;
      req.user = session.role === 'admin'
        ? { id: 'admin', name: 'Admin', email: config.adminEmail, role: 'admin' }
        : store.data.users.find((u) => u.id === session.userId);
    }
    next();
  };
}

export const requireUser = (req, _res, next) => {
  if (!req.user || req.role !== 'user') throw new HttpError(401, 'Please log in or sign up to continue');
  next();
};

function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a ?? '')).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

export const requireAdmin = (req, _res, next) => {
  if (!req.role) throw new HttpError(401, 'Admin login required');
  if (req.role !== 'admin') throw new HttpError(403, 'Access denied');
  next();
};

function startSession(store, userId, role) {
  const token = newToken();
  store.update((d) => {
    const now = Date.now();
    for (const [t, s] of Object.entries(d.sessions)) if (s.exp <= now) delete d.sessions[t];
    d.sessions[token] = { userId, role, exp: now + SESSION_DAYS * 864e5 };
  });
  return token;
}

const cleanEmail = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

export function authRoutes(store, config) {
  const r = Router();

  r.post('/auth/signup', (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = cleanEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!name) throw new HttpError(400, 'Please enter your name');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'Please enter a valid email');
    if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
    if (email === config.adminEmail || store.data.users.some((u) => u.email === email)) {
      throw new HttpError(409, 'An account with this email already exists');
    }
    const user = { id: newId('usr'), name, email, role: 'user', wallet: SIGNUP_WALLET_BONUS, createdAt: new Date().toISOString(), ...hashPassword(password) };
    store.update((d) => d.users.push(user));
    res.status(201).json({ token: startSession(store, user.id, 'user'), user: publicUser(user) });
  });

  r.post('/auth/login', (req, res) => {
    const email = cleanEmail(req.body?.email);
    const user = store.data.users.find((u) => u.email === email);
    if (!user || !verifyPassword(String(req.body?.password || ''), user.salt, user.hash)) {
      throw new HttpError(401, 'Incorrect email or password');
    }
    res.json({ token: startSession(store, user.id, 'user'), user: publicUser(user) });
  });

  r.post('/auth/logout', (req, res) => {
    if (req.token) store.update((d) => delete d.sessions[req.token]);
    res.json({ ok: true });
  });

  r.get('/auth/me', (req, res) => {
    if (!req.user) throw new HttpError(401, 'Not logged in');
    res.json({ user: req.role === 'admin' ? req.user : publicUser(req.user) });
  });

  r.post('/admin/login', (req, res) => {
    const email = cleanEmail(req.body?.email);
    if (!config.adminPassword) throw new HttpError(503, 'Admin login is not configured on this server');
    if (email !== config.adminEmail || !safeEqual(req.body?.password, config.adminPassword)) {
      throw new HttpError(401, 'Incorrect admin credentials');
    }
    res.json({ token: startSession(store, 'admin', 'admin'), user: { id: 'admin', name: 'Admin', email, role: 'admin' } });
  });

  return r;
}
