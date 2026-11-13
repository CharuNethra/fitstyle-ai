import { bufferToDataUrl } from './imageUtils.js';
import { prepareGarment, preparePerson, restorePersonFrame } from './preprocess.js';

// Gemini image models (Google AI Studio), tried in order on overload, rate limits or retired models;
// the whole list is retried once after a short pause.
export const GEMINI_IMAGE_FALLBACK_MODELS = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview'];
const RETRYABLE = new Set([404, 408, 429, 500, 502, 503, 504]);
const RETRY_DELAY_MS = 2_000;

const GARMENT_AREA = {
  'one-pieces': 'full outfit (it is a dress/gown, so it replaces both top and bottom)',
  bottoms: 'lower-body clothing',
  tops: 'upper-body clothing',
  auto: 'outfit',
};

export function tryOnPrompt(product, category) {
  return [
    'You are a virtual try-on engine for a fashion store.',
    'Image 1 is a photo of a person. Image 2 is a product photo of a garment on a white background.',
    `Generate one photorealistic image of the exact same person from image 1 wearing the garment from image 2 (${product.colorName} ${product.name}, ${product.fabric}) as their ${GARMENT_AREA[category] || GARMENT_AREA.auto}.`,
    "Keep the person's face, identity, skin tone, hair, body shape, pose, camera framing and background exactly as in image 1.",
    "Reproduce the garment's colour, fabric, pattern and design faithfully, fitted naturally to the body with realistic folds, lighting and shadows.",
    'Do not add accessories, text or extra people. Return only the image.',
  ].join(' ');
}

async function geminiImageRequest(model, parts, config) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '3:4' } },
    }),
    signal: AbortSignal.timeout(config.tryOnTimeoutMs ?? 120_000),
  });
  if (!res.ok) {
    const body = (await res.text()).replace(/\s+/g, ' ');
    // Billing, permission and free-tier errors (e.g. a 0 image quota) will not clear on a retry.
    const unavailable = [400, 401, 403].includes(res.status) || (res.status === 429 && /limit: 0\b|free_tier|billing/i.test(body));
    throw Object.assign(new Error(`Gemini ${model} responded ${res.status}: ${body.slice(0, 200)}`), {
      retryable: RETRYABLE.has(res.status) && !unavailable,
      unavailable,
      quota: res.status === 429,
    });
  }
  const json = await res.json();
  const image = (json.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data);
  const data = image && (image.inlineData || image.inline_data).data;
  if (!data) {
    const reason = json.candidates?.[0]?.finishReason || json.promptFeedback?.blockReason || 'no image';
    throw Object.assign(new Error(`Gemini ${model} returned no image (${reason})`), { retryable: true });
  }
  return Buffer.from(data, 'base64');
}

/** Virtual try-on with a Gemini image model: preprocessed person + garment in, person wearing the garment out. */
export async function geminiTryOn(photo, garment, product, category, config) {
  const person = await preparePerson(photo);
  const cleanGarment = await prepareGarment(garment);
  const parts = [
    { text: tryOnPrompt(product, category) },
    { inline_data: { mime_type: 'image/jpeg', data: person.image.toString('base64') } },
    { inline_data: { mime_type: 'image/png', data: cleanGarment.toString('base64') } },
  ];
  return generateWithFallback(parts, person, config);
}

export function addItemPrompt(product) {
  return [
    'You are a virtual styling engine for a fashion store.',
    `Image 1 is a photo of a dressed person. Image 2 is a product photo of ${product.category === 'Footwear' ? 'footwear' : 'an accessory'}: ${product.colorName} ${product.name} (${product.subCategory}).`,
    'Generate one photorealistic image of the exact same person now also wearing or carrying that item in its natural place (shoes on the feet, bag in hand or on the shoulder, jewellery, watch, sunglasses, belt or scarf worn correctly).',
    "Keep the person's face, identity, outfit, body, pose, camera framing and background exactly as in image 1.",
    'Do not add any other items, text or people. Return only the image.',
  ].join(' ');
}

export async function geminiAddItem(photo, item, product, config) {
  const person = await preparePerson(photo);
  const cleanItem = await prepareGarment(item);
  const parts = [
    { text: addItemPrompt(product) },
    { inline_data: { mime_type: 'image/jpeg', data: person.image.toString('base64') } },
    { inline_data: { mime_type: 'image/png', data: cleanItem.toString('base64') } },
  ];
  return generateWithFallback(parts, person, config);
}

async function generateWithFallback(parts, person, config) {
  const models = [...new Set([config.geminiImageModel, ...GEMINI_IMAGE_FALLBACK_MODELS].filter(Boolean))];
  let lastErr;
  for (let pass = 0; pass < 2; pass += 1) {
    if (pass) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    const result = await tryModels(models, parts, person, config).catch((err) => {
      lastErr = err;
      return null;
    });
    if (result) return result;
    if (lastErr && !lastErr.retryable && lastErr.name !== 'TimeoutError' && lastErr.name !== 'AbortError') break;
  }
  throw lastErr || new Error('Gemini try-on ran out of time');
}

async function tryModels(models, parts, person, config) {
  let lastErr;
  for (const model of models) {
    const remaining = config.deadline ? config.deadline - Date.now() : Infinity;
    if (remaining < 5_000) break;
    try {
      const timeout = Math.min(config.tryOnTimeoutMs ?? 120_000, remaining);
      const result = await geminiImageRequest(model, parts, { ...config, tryOnTimeoutMs: timeout });
      const restored = await restorePersonFrame(result, person.frame);
      return { image: bufferToDataUrl(restored), model };
    } catch (err) {
      lastErr = err;
      const timedOut = err.name === 'TimeoutError' || err.name === 'AbortError';
      if (!err.retryable && !timedOut) throw err;
      console.warn(`[try-on] ${model} unavailable (${timedOut ? 'timeout' : err.message.slice(0, 120)}), trying next`);
    }
  }
  throw lastErr || new Error('Gemini try-on ran out of time');
}
