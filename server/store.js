import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const EMPTY = () => ({
  users: [],
  sessions: {},
  catalog: { added: [], updated: {}, removed: [] },
  offers: { codes: [], banners: [], saleTags: {} },
  orders: [],
  resets: {},
});

const parse = (raw) => {
  try {
    return { ...EMPTY(), ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return EMPTY();
  }
};

/**
 * Upstash Redis REST client (what Vercel's Upstash/KV integration provides). The whole demo
 * database is one JSON document under `key`, so every serverless instance sees the same users and sessions.
 */
export function upstashRedis(url, token, key = 'fitstyle:db') {
  const call = async (cmd) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd),
      signal: AbortSignal.timeout(10_000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.error) throw new Error(`Redis ${cmd[0]} failed: ${body.error || res.status}`);
    return body.result;
  };
  return { get: () => call(['GET', key]), set: (value) => call(['SET', key, value]) };
}

/**
 * Demo database (users, sessions, catalogue edits, offers, orders).
 * With `remote` (Redis) it is reloaded before each API request and changes are written back before the response;
 * otherwise it is a JSON file (`file`), or memory only when `file` is empty.
 */
export function createStore(file, remote = null) {
  let data = EMPTY();
  let pending = [];
  if (!remote && file && fs.existsSync(file)) {
    try {
      data = { ...EMPTY(), ...JSON.parse(fs.readFileSync(file, 'utf8')) };
    } catch {
      // corrupt file: start fresh
    }
  }
  const save = () => {
    if (!file || remote) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  };
  return {
    get data() {
      return data;
    },
    kind: remote ? 'redis' : file ? 'file' : 'memory',
    update(fn) {
      const out = fn(data);
      if (remote) pending.push(fn);
      else save();
      return out;
    },
    async load() {
      if (remote) data = parse(await remote.get());
    },
    /** Re-applies this request's changes to the latest copy, so writes from other instances are kept. */
    async flush() {
      if (!remote || !pending.length) return;
      const changes = pending;
      pending = [];
      const fresh = parse(await remote.get());
      for (const fn of changes) fn(fresh);
      data = fresh;
      await remote.set(JSON.stringify(fresh));
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
