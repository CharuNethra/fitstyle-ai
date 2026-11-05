import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const EMPTY = () => ({
  users: [],
  sessions: {},
  catalog: { added: [], updated: {}, removed: [] },
  offers: { codes: [], banners: [], saleTags: {} },
  orders: [],
});

/** Tiny JSON-file database for the demo (users, sessions, catalogue edits, offers, orders). */
export function createStore(file) {
  let data = EMPTY();
  if (file && fs.existsSync(file)) {
    try {
      data = { ...EMPTY(), ...JSON.parse(fs.readFileSync(file, 'utf8')) };
    } catch {
      // corrupt file: start fresh
    }
  }
  const save = () => {
    if (!file) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  };
  return {
    get data() {
      return data;
    },
    update(fn) {
      const out = fn(data);
      save();
      return out;
    },
  };
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}

export function verifyPassword(password, salt, hash) {
  const candidate = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate);
}

export const newId = (prefix) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
export const newToken = () => crypto.randomBytes(24).toString('hex');
