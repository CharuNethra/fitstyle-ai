import { Client, handle_file } from '@gradio/client';
import sharp from 'sharp';
import { bufferToDataUrl } from './imageUtils.js';

// Free, open-source try-on models hosted as public Hugging Face Spaces (ZeroGPU).
const MODEL_W = 768;
const MODEL_H = 1024;
const clients = new Map();

function connect(space, config) {
  if (!clients.has(space)) {
    const opts = config.hfToken ? { token: config.hfToken } : {};
    const p = Client.connect(space, opts).catch((err) => {
      clients.delete(space);
      throw err;
    });
    clients.set(space, p);
  }
  return clients.get(space);
}

function errorText(err) {
  return err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
}

function fileUrl(file) {
  return typeof file === 'string' ? file : file?.url || file?.image?.url || file?.image;
}

function withTimeout(promise, ms, space) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${space} timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Pads the photo to the 3:4 portrait the models expect so the person is not stretched. */
async function toPortrait(photo) {
  const { data, info } = await sharp(photo).rotate().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const ratio = MODEL_W / MODEL_H;
  const padW = w / h > ratio ? w : Math.round(h * ratio);
  const padH = w / h > ratio ? Math.round(w / ratio) : h;
  const left = Math.floor((padW - w) / 2);
  const top = Math.floor((padH - h) / 2);
  const padded = await sharp(data)
    .extend({ left, right: padW - w - left, top, bottom: padH - h - top, extendWith: 'copy' })
    .resize(MODEL_W, MODEL_H, { fit: 'fill' })
    .jpeg({ quality: 95 })
    .toBuffer();
  return { padded, crop: { left, top, width: w, height: h }, padW, padH };
}

async function restoreFrame(resultBuf, portrait) {
  const out = await sharp(resultBuf)
    .resize(portrait.padW, portrait.padH, { fit: 'fill' })
    .extract(portrait.crop)
    .jpeg({ quality: 92 })
    .toBuffer();
  return bufferToDataUrl(out);
}

function ootdCategory(category) {
  if (category === 'one-pieces') return 'Dress';
  if (category === 'bottoms') return 'Lower-body';
  return 'Upper-body';
}

async function runSpace(space, person, garment, product, category, config) {
  const client = await connect(space, config);
  const personFile = handle_file(new Blob([person], { type: 'image/jpeg' }));
  const garmentFile = handle_file(new Blob([garment], { type: 'image/png' }));
  if (/ootd/i.test(space)) {
    const res = await client.predict('/process_dc', {
      vton_img: personFile,
      garm_img: garmentFile,
      category: ootdCategory(category),
      n_samples: 1,
      n_steps: 20,
      image_scale: 2,
      seed: 42,
    });
    const gallery = res.data?.[0];
    return fileUrl(Array.isArray(gallery) ? gallery[0] : gallery);
  }
  // IDM-VTON and its mirrors.
  const res = await client.predict('/tryon', {
    dict: { background: personFile, layers: [], composite: null },
    garm_img: garmentFile,
    garment_des: `${product.colorName} ${product.name}`.toLowerCase(),
    is_checked: true,
    is_checked_crop: false,
    denoise_steps: 30,
    seed: 42,
  });
  return fileUrl(res.data?.[0]);
}

export function spacesFor(category, config) {
  const spaces = category === 'one-pieces' ? [config.hfDressSpace, ...config.hfSpaces] : config.hfSpaces;
  return [...new Set(spaces.filter(Boolean))];
}

export async function huggingFaceTryOn(photo, garment, product, category, config) {
  const portrait = await toPortrait(photo);
  const errors = [];
  for (const space of spacesFor(category, config)) {
    try {
      const url = await withTimeout(
        runSpace(space, portrait.padded, garment, product, category, config),
        config.tryOnTimeoutMs ?? 180_000,
        space,
      );
      if (!url) throw new Error('no image returned');
      const headers = config.hfToken ? { Authorization: `Bearer ${config.hfToken}` } : {};
      const img = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
      if (!img.ok) throw new Error(`could not download result (${img.status})`);
      const image = await restoreFrame(Buffer.from(await img.arrayBuffer()), portrait);
      return { image, model: space };
    } catch (err) {
      const msg = errorText(err);
      console.warn(`[try-on] ${space} failed: ${msg.slice(0, 200)}`);
      errors.push({ space, msg });
    }
  }
  const err = new Error(errors.map((e) => `${e.space}: ${e.msg.slice(0, 120)}`).join(' | ') || 'no spaces configured');
  err.quota = errors.some((e) => /quota/i.test(e.msg));
  throw err;
}
