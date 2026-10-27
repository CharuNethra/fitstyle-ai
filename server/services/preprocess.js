import sharp from 'sharp';

/** Standard 3:4 portrait resolution used by the open-source try-on models. */
export const TRYON_W = 768;
export const TRYON_H = 1024;
const GARMENT_MARGIN = 0.06;

/**
 * Garment crop & mask: flattens transparency onto white, trims the empty
 * background around the garment, then centres it on a clean white
 * 768x1024 canvas with a small margin.
 */
export async function prepareGarment(buffer) {
  const flat = await sharp(buffer).rotate().flatten({ background: '#ffffff' }).png().toBuffer();
  let cropped = flat;
  try {
    cropped = await sharp(flat).trim({ background: '#ffffff', threshold: 18 }).toBuffer();
  } catch {
    // Uniform image: nothing to trim.
  }
  const boxW = Math.round(TRYON_W * (1 - 2 * GARMENT_MARGIN));
  const boxH = Math.round(TRYON_H * (1 - 2 * GARMENT_MARGIN));
  const fitted = await sharp(cropped)
    .resize(boxW, boxH, { fit: 'inside' })
    .toBuffer({ resolveWithObject: true });
  const { width, height } = fitted.info;
  const left = Math.floor((TRYON_W - width) / 2);
  const top = Math.floor((TRYON_H - height) / 2);
  return sharp(fitted.data)
    .extend({
      left,
      right: TRYON_W - width - left,
      top,
      bottom: TRYON_H - height - top,
      background: '#ffffff',
    })
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer();
}

/**
 * Person alignment: pads the upright photo (repeating its edges, so the
 * person is never stretched) to 3:4 and resizes it to exactly 768x1024.
 * Returns the frame info needed to map the result back with restorePersonFrame.
 */
export async function preparePerson(buffer) {
  const { data, info } = await sharp(buffer).rotate().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const ratio = TRYON_W / TRYON_H;
  const padW = w / h > ratio ? w : Math.round(h * ratio);
  const padH = w / h > ratio ? Math.round(w / ratio) : h;
  const left = Math.floor((padW - w) / 2);
  const top = Math.floor((padH - h) / 2);
  // sharp resizes before extending within one pipeline, so pad in a separate pass.
  const padded = await sharp(data)
    .extend({ left, right: padW - w - left, top, bottom: padH - h - top, extendWith: 'copy' })
    .toBuffer();
  const image = await sharp(padded)
    .resize(TRYON_W, TRYON_H, { fit: 'fill' })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 95 })
    .toBuffer();
  return { image, frame: { crop: { left, top, width: w, height: h }, padW, padH } };
}

/** Maps a 768x1024 model result back onto the original photo's frame. */
export async function restorePersonFrame(resultBuf, frame) {
  return sharp(resultBuf)
    .resize(frame.padW, frame.padH, { fit: 'fill' })
    .extract(frame.crop)
    .jpeg({ quality: 92 })
    .toBuffer();
}
