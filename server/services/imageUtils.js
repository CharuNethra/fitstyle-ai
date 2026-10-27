import sharp from 'sharp';

const DATA_URL_RE = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i;

export function dataUrlToBuffer(dataUrl) {
  const m = typeof dataUrl === 'string' && dataUrl.match(DATA_URL_RE);
  if (!m) return null;
  return Buffer.from(m[2], 'base64');
}

export function bufferToDataUrl(buf, mime = 'image/jpeg') {
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/** Normalises any supported upload (jpg/png/webp/svg/heic-less) to an upright JPEG. */
export async function normalizePhoto(buffer, maxHeight = 1024) {
  return sharp(buffer, { failOn: 'error' })
    .rotate()
    .flatten({ background: '#ffffff' })
    .resize({ height: maxHeight, width: maxHeight, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/**
 * Lightweight person localisation: estimates the subject's bounding box by
 * comparing every pixel against the average border colour (works best on
 * plain studio-like backgrounds; falls back to a centred default box).
 */
export async function analyzePhoto(buffer) {
  const W = 96;
  const { data, info } = await sharp(buffer)
    .resize({ width: W, fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const px = (x, y) => {
    const i = (y * w + x) * 3;
    return [data[i], data[i + 1], data[i + 2]];
  };

  const border = [0, 0, 0];
  let n = 0;
  for (let x = 0; x < w; x++) {
    for (const y of [0, 1, h - 2, h - 1]) {
      const c = px(x, y);
      border[0] += c[0]; border[1] += c[1]; border[2] += c[2]; n++;
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, 1, w - 2, w - 1]) {
      const c = px(x, y);
      border[0] += c[0]; border[1] += c[1]; border[2] += c[2]; n++;
    }
  }
  border[0] /= n; border[1] /= n; border[2] /= n;

  const colHits = new Array(w).fill(0);
  const rowHits = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = px(x, y);
      const dist = Math.abs(c[0] - border[0]) + Math.abs(c[1] - border[1]) + Math.abs(c[2] - border[2]);
      if (dist > 70) { colHits[x]++; rowHits[y]++; }
    }
  }
  const firstLast = (arr, min) => {
    let a = arr.findIndex((v) => v >= min);
    let b = arr.length - 1 - [...arr].reverse().findIndex((v) => v >= min);
    if (a < 0) { a = -1; b = -1; }
    return [a, b];
  };
  let [x0, x1] = firstLast(colHits, Math.max(2, h * 0.08));
  let [y0, y1] = firstLast(rowHits, Math.max(1, w * 0.04));

  let detected = true;
  const bw = x1 - x0;
  const bh = y1 - y0;
  if (x0 < 0 || y0 < 0 || bw < w * 0.15 || bh < h * 0.35 || bw > w * 0.97) {
    detected = false;
    x0 = w * 0.3; x1 = w * 0.7; y0 = h * 0.06; y1 = h * 0.96;
  }

  // Sample the face/neck area for an approximate tone reading.
  const sx0 = Math.round(x0 + (x1 - x0) * 0.4);
  const sx1 = Math.round(x0 + (x1 - x0) * 0.6);
  const sy0 = Math.round(y0 + (y1 - y0) * 0.03);
  const sy1 = Math.round(y0 + (y1 - y0) * 0.11);
  const tone = [0, 0, 0];
  let tn = 0;
  for (let y = sy0; y <= sy1; y++) {
    for (let x = sx0; x <= sx1; x++) {
      const c = px(Math.min(w - 1, Math.max(0, x)), Math.min(h - 1, Math.max(0, y)));
      tone[0] += c[0]; tone[1] += c[1]; tone[2] += c[2]; tn++;
    }
  }
  tone[0] /= tn; tone[1] /= tn; tone[2] /= tn;

  return {
    width: w,
    height: h,
    detected,
    box: { x: x0 / w, y: y0 / h, w: (x1 - x0) / w, h: (y1 - y0) / h },
    toneRgb: tone.map(Math.round),
    backgroundRgb: border.map(Math.round),
  };
}

export function luminanceOf([r, g, b]) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function hashBuffer(buf) {
  let h = 2166136261;
  const step = Math.max(1, Math.floor(buf.length / 4096));
  for (let i = 0; i < buf.length; i += step) {
    h ^= buf[i];
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
