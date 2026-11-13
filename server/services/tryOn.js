import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { garmentSvg, GARMENT_SHAPES } from '../../shared/garments.js';
import { analyzePhoto, bufferToDataUrl } from './imageUtils.js';
import { huggingFaceTryOn } from './hfTryOn.js';
import { geminiAddItem, geminiTryOn } from './geminiTryOn.js';
import { HttpError } from '../http.js';

const ONE_PIECE = new Set(['dress', 'gown']);
const PUBLIC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public');

export function fashnCategory(product) {
  if (product.tryOnCategory) return product.tryOnCategory;
  return ONE_PIECE.has(product.type) ? 'one-pieces' : 'tops';
}

/** Garment reference for real try-on models: the product photo when available, otherwise the rendered illustration. */
export async function garmentPng(product, width = 768) {
  const source = product.tryOnImage || product.image;
  if (source && /^https:\/\//.test(source)) {
    const res = await fetch(source, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`Garment image responded ${res.status}`);
    return sharp(Buffer.from(await res.arrayBuffer())).flatten({ background: '#ffffff' }).png().toBuffer();
  }
  if (source) {
    const file = path.join(PUBLIC_DIR, path.normalize(source).replace(/^([/\\])+/, ''));
    return sharp(await fs.readFile(file)).flatten({ background: '#ffffff' }).png().toBuffer();
  }
  return sharp(Buffer.from(garmentSvg(product, { background: true })))
    .resize({ width })
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer();
}

/** Offline stub for automated tests only (TRYON_PROVIDER=mock); never used as a fallback for real try-ons. */
export async function mockTryOn(photo, product) {
  const meta = await sharp(photo).metadata();
  const W = meta.width;
  const H = meta.height;
  const analysis = await analyzePhoto(photo);
  const box = {
    x: analysis.box.x * W,
    y: analysis.box.y * H,
    w: analysis.box.w * W,
    h: analysis.box.h * H,
  };

  const shape = GARMENT_SHAPES[product.type] || GARMENT_SHAPES.dress;
  const [sx0, sx1] = shape.shoulders;
  const shoulderPx = Math.max(box.w * 0.68, box.h * 0.2);
  const scale = shoulderPx / (sx1 - sx0);
  const gw = Math.max(1, Math.round(200 * scale));
  const gh = Math.max(1, Math.round(shape.h * scale));
  const shoulderY = box.y + box.h * 0.17;
  const centerX = box.x + box.w / 2;
  let left = Math.round(centerX - ((sx0 + sx1) / 2) * scale);
  let top = Math.round(shoulderY - 10 * scale);

  let garment = await sharp(Buffer.from(garmentSvg(product)))
    .resize({ width: gw, height: gh, fit: 'fill' })
    .png()
    .toBuffer();

  // Crop anything that would fall outside the canvas.
  const cropLeft = Math.max(0, -left);
  const cropTop = Math.max(0, -top);
  const visW = Math.min(gw - cropLeft, W - Math.max(0, left));
  const visH = Math.min(gh - cropTop, H - Math.max(0, top));
  if (visW <= 0 || visH <= 0) {
    throw new Error('Could not position garment on photo');
  }
  if (cropLeft || cropTop || visW < gw || visH < gh) {
    garment = await sharp(garment).extract({ left: cropLeft, top: cropTop, width: visW, height: visH }).toBuffer();
  }
  left = Math.max(0, left);
  top = Math.max(0, top);

  const shadow = await sharp(garment)
    .ensureAlpha()
    .modulate({ brightness: 0 })
    .blur(Math.max(1, scale * 3))
    .linear([1, 1, 1, 0.35], [0, 0, 0, 0])
    .toBuffer();

  const out = await sharp(photo)
    .composite([
      { input: shadow, left: Math.min(W - 1, left + Math.round(scale * 2)), top: Math.min(H - 1, top + Math.round(scale * 3)) },
      { input: garment, left, top },
    ])
    .jpeg({ quality: 88 })
    .toBuffer();

  return { image: bufferToDataUrl(out), detected: analysis.detected };
}

async function falTryOn(photo, product, config) {
  const garment = await garmentPng(product);
  const human = bufferToDataUrl(photo);
  const cloth = bufferToDataUrl(garment, 'image/png');
  const isKling = /kling|kolors/i.test(config.falModel);
  const body = isKling
    ? { human_image_url: human, garment_image_url: cloth }
    : { model_image: human, garment_image: cloth, category: fashnCategory(product) };
  const res = await fetch(`https://fal.run/${config.falModel}`, {
    method: 'POST',
    headers: { Authorization: `Key ${config.falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.tryOnTimeoutMs ?? 120_000),
  });
  if (!res.ok) throw new Error(`fal.ai responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const url = json?.images?.[0]?.url || json?.image?.url;
  if (!url) throw new Error('fal.ai returned no image');
  return { image: url };
}

async function fashnTryOn(photo, product, config) {
  const garment = await garmentPng(product);
  const headers = { Authorization: `Bearer ${config.fashnKey}`, 'Content-Type': 'application/json' };
  const run = await fetch('https://api.fashn.ai/v1/run', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model_name: 'tryon-v1.6',
      inputs: {
        model_image: bufferToDataUrl(photo),
        garment_image: bufferToDataUrl(garment, 'image/png'),
        category: fashnCategory(product),
      },
    }),
  });
  if (!run.ok) throw new Error(`FASHN responded ${run.status}: ${(await run.text()).slice(0, 200)}`);
  const { id } = await run.json();
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));
    const st = await fetch(`https://api.fashn.ai/v1/status/${id}`, { headers });
    const json = await st.json();
    if (json.status === 'completed' && json.output?.[0]) return { image: json.output[0] };
    if (json.status === 'failed') throw new Error(`FASHN failed: ${JSON.stringify(json.error)}`);
  }
  throw new Error('FASHN timed out');
}

async function hfTryOn(photo, product, config) {
  return huggingFaceTryOn(photo, await garmentPng(product), product, fashnCategory(product), config);
}

async function geminiImageTryOn(photo, product, config) {
  return geminiTryOn(photo, await garmentPng(product), product, fashnCategory(product), config);
}

const PROVIDERS = { gemini: geminiImageTryOn, huggingface: hfTryOn, fal: falTryOn, fashn: fashnTryOn };
const PROVIDER_NAMES = { gemini: 'Gemini', huggingface: 'Hugging Face', fal: 'Fal.ai', fashn: 'FASHN' };

export function providerChain(config) {
  if (config.tryOnProvider === 'mock') return ['mock'];
  const chain = [config.tryOnProvider, 'huggingface', config.geminiKey && 'gemini'];
  return [...new Set(chain.filter((p) => PROVIDERS[p]))];
}

export function tryOnUnavailable(errors) {
  const quota = errors.some((e) => e.quota || /quota|429/i.test(e.message));
  return new HttpError(
    503,
    quota
      ? 'Our AI fitting room has reached its usage limit for now. Please try again in a few minutes.'
      : 'Our AI fitting room is busy right now. Please try again in a moment.',
    { retryable: true },
  );
}

// Tries each real provider in turn within one time budget. If all fail, the client gets a
// retryable 503 instead of a fake composite.
export async function runTryOn(photo, product, config) {
  const chain = providerChain(config);
  if (chain[0] === 'mock') return { ...(await mockTryOn(photo, product)), provider: 'mock' };
  const deadline = Date.now() + (config.tryOnBudgetMs ?? 240_000);
  const errors = [];
  for (const name of chain) {
    const remaining = deadline - Date.now();
    if (remaining < 5_000) break;
    try {
      const cfg = { ...config, tryOnTimeoutMs: Math.min(config.tryOnTimeoutMs ?? 120_000, remaining), deadline };
      return { ...(await PROVIDERS[name](photo, product, cfg)), provider: name };
    } catch (err) {
      console.warn(`[try-on] ${PROVIDER_NAMES[name]} failed: ${String(err.message).slice(0, 300)}`);
      errors.push(err);
    }
  }
  throw tryOnUnavailable(errors);
}

async function mockAddItem(photo, product) {
  const { width: W, height: H } = await sharp(photo).metadata();
  const size = Math.round(Math.min(W, H) * 0.28);
  const thumb = await sharp(await garmentPng(product))
    .flatten({ background: '#ffffff' })
    .resize(size, size, { fit: 'contain', background: '#ffffff' })
    .extend({ top: 6, bottom: 6, left: 6, right: 6, background: '#ffffff' })
    .png()
    .toBuffer();
  const margin = Math.round(Math.min(W, H) * 0.03);
  const top = product.category === 'Footwear' ? H - size - 12 - margin : margin;
  const out = await sharp(photo).composite([{ input: thumb, left: W - size - 12 - margin, top }]).jpeg({ quality: 90 }).toBuffer();
  return { image: bufferToDataUrl(out) };
}

// Adds one recommended piece to an existing look. Dresses re-run the main try-on;
// footwear and accessories are layered by Gemini (or shown as a labelled pairing preview when no Gemini key is set).
export async function runLayerTryOn(photo, product, config) {
  if (product.category === 'Dresses') return runTryOn(photo, product, config);
  if (config.tryOnProvider === 'gemini' && config.geminiKey) {
    try {
      return { ...(await geminiAddItem(photo, await garmentPng(product), product, config)), provider: 'gemini' };
    } catch (err) {
      console.warn('[try-on] Gemini layering failed:', err.message);
      throw tryOnUnavailable([err]);
    }
  }
  return { ...(await mockAddItem(photo, product)), provider: 'mock', warning: 'Footwear and accessories are layered by Gemini — showing a styled pairing preview.' };
}
