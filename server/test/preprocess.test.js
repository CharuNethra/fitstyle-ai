import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { prepareGarment, preparePerson, restorePersonFrame, TRYON_W, TRYON_H } from '../services/preprocess.js';

async function pixel(buf, x, y) {
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * 3;
  return [data[i], data[i + 1], data[i + 2]];
}

function rect(width, height, background, shape) {
  return sharp({ create: { width, height, channels: 4, background } })
    .composite([{ input: { create: { ...shape.size, channels: 4, background: shape.color } }, ...shape.at }])
    .png()
    .toBuffer();
}

test('garment is trimmed, centred and padded white to 768x1024', async () => {
  const input = await rect(1200, 500, '#ffffff', {
    size: { width: 200, height: 300 },
    color: '#cc0000',
    at: { left: 50, top: 150 },
  });
  const out = await prepareGarment(input);
  const meta = await sharp(out).metadata();
  assert.equal(meta.width, TRYON_W);
  assert.equal(meta.height, TRYON_H);
  const [r, g, b] = await pixel(out, TRYON_W / 2, TRYON_H / 2);
  assert.ok(r > 180 && g < 40 && b < 40, 'garment centred');
  assert.deepEqual(await pixel(out, 5, 5), [255, 255, 255]);
  assert.deepEqual(await pixel(out, TRYON_W - 5, TRYON_H - 5), [255, 255, 255]);
});

test('transparent garment background becomes clean white', async () => {
  const input = await rect(400, 400, { r: 0, g: 0, b: 0, alpha: 0 }, {
    size: { width: 200, height: 200 },
    color: '#0033aa',
    at: { left: 100, top: 100 },
  });
  const out = await prepareGarment(input);
  assert.deepEqual(await pixel(out, 3, 3), [255, 255, 255]);
  assert.deepEqual(await pixel(out, TRYON_W / 2, 10), [255, 255, 255]);
});

test('person photo is aligned to 768x1024 and restored to its own frame', async () => {
  const photo = await sharp({ create: { width: 1000, height: 500, channels: 3, background: '#556677' } })
    .jpeg()
    .toBuffer();
  const { image, frame } = await preparePerson(photo);
  const meta = await sharp(image).metadata();
  assert.equal(meta.width, TRYON_W);
  assert.equal(meta.height, TRYON_H);
  const restored = await sharp(await restorePersonFrame(image, frame)).metadata();
  assert.equal(restored.width, 1000);
  assert.equal(restored.height, 500);
});
