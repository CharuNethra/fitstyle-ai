import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { garmentSvg } from '../../shared/garments.js';
import { geminiAddItem, geminiTryOn } from './geminiTryOn.js';
import { HttpError } from '../http.js';

export const TRYON_BUSY_MESSAGE = 'Our Try-on is busy right now, try again later';

const ONE_PIECE = new Set(['dress', 'gown']);
const PUBLIC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public');

export function garmentCategory(product) {
  if (product.tryOnCategory) return product.tryOnCategory;
  return ONE_PIECE.has(product.type) ? 'one-pieces' : 'tops';
}

/** Garment reference sent to Gemini: the product photo when available, otherwise the rendered illustration. */
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

function busy(err) {
  console.warn(`[try-on] Gemini failed: ${String(err?.message).slice(0, 300)}`);
  return new HttpError(503, TRYON_BUSY_MESSAGE, { retryable: true });
}

const withDeadline = (config) => ({ ...config, deadline: Date.now() + (config.tryOnBudgetMs ?? 240_000) });

// Virtual try-on runs only on Gemini. If Gemini is rate-limited, busy or fails after its retry,
// the client gets a text-only 503 and no image.
export async function runTryOn(photo, product, config) {
  if (!config.geminiKey) throw busy(new Error('GEMINI_API_KEY is not set'));
  try {
    const result = await geminiTryOn(photo, await garmentPng(product), product, garmentCategory(product), withDeadline(config));
    return { ...result, provider: 'gemini' };
  } catch (err) {
    throw busy(err);
  }
}

// Adds one recommended piece to an existing look: dresses re-run the try-on, footwear and accessories are added by Gemini.
export async function runLayerTryOn(photo, product, config) {
  if (product.category === 'Dresses') return runTryOn(photo, product, config);
  if (!config.geminiKey) throw busy(new Error('GEMINI_API_KEY is not set'));
  try {
    return { ...(await geminiAddItem(photo, await garmentPng(product), product, withDeadline(config))), provider: 'gemini' };
  } catch (err) {
    throw busy(err);
  }
}
