import { dataUrlToBuffer } from './imageUtils.js';

/** Parses the first complete JSON object in the text (models sometimes append extra text or a second object). */
export function extractJson(text) {
  const cleaned = String(text).replace(/```json|```/g, '');
  const start = cleaned.indexOf('{');
  if (start < 0) throw new Error('No JSON object in model response');
  let depth = 0;
  let inString = false;
  for (let i = start; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (inString) {
      if (ch === '\\') i += 1;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return JSON.parse(cleaned.slice(start, i + 1));
  }
  throw new Error('Incomplete JSON object in model response');
}

async function toInlineImage(image) {
  const buf = dataUrlToBuffer(image);
  if (buf) return { mime: image.slice(5, image.indexOf(';')), data: buf.toString('base64') };
  const res = await fetch(image, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Could not fetch image (${res.status})`);
  return {
    mime: res.headers.get('content-type') || 'image/jpeg',
    data: Buffer.from(await res.arrayBuffer()).toString('base64'),
  };
}

async function openaiJson(prompt, image, config) {
  const content = [{ type: 'text', text: prompt }];
  if (image) content.push({ type: 'image_url', image_url: { url: image } });
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.openaiModel,
      response_format: { type: 'json_object' },
      temperature: 0.6,
      messages: [
        { role: 'system', content: 'You are an expert fashion stylist. Always reply with a single valid JSON object.' },
        { role: 'user', content },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return extractJson(json.choices[0].message.content);
}

const GEMINI_FALLBACK_MODELS = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];
const RETRYABLE = new Set([404, 408, 429, 500, 502, 503, 504]);

async function geminiRequest(model, parts, config) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
    }),
    signal: AbortSignal.timeout(config.aiTimeoutMs ?? 30_000),
  });
  if (!res.ok) {
    const detail = (await res.text()).replace(/\s+/g, ' ').slice(0, 160);
    const err = new Error(`Gemini ${model} responded ${res.status}: ${detail}`);
    err.retryable = RETRYABLE.has(res.status);
    throw err;
  }
  const json = await res.json();
  const text = (json.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  if (!text) throw Object.assign(new Error(`Gemini ${model} returned no content`), { retryable: true });
  try {
    return extractJson(text);
  } catch (err) {
    throw Object.assign(new Error(`Gemini ${model} returned invalid JSON: ${err.message}`), { retryable: true });
  }
}

/** Tries the configured Gemini model, then fallbacks on overload, rate limits, timeouts or retired models. */
async function geminiJson(prompt, image, config) {
  const parts = [{ text: prompt }];
  if (image) {
    const inline = await toInlineImage(image);
    parts.push({ inline_data: { mime_type: inline.mime, data: inline.data } });
  }
  const models = [...new Set([config.geminiModel, ...GEMINI_FALLBACK_MODELS])];
  const passes = config.geminiPasses ?? 2;
  let lastErr;
  for (let pass = 0; pass < passes; pass += 1) {
    if (pass > 0) await new Promise((r) => setTimeout(r, 1500 * pass));
    for (const model of models) {
      try {
        return await geminiRequest(model, parts, config);
      } catch (err) {
        lastErr = err;
        const timedOut = err.name === 'TimeoutError' || err.name === 'AbortError';
        if (!err.retryable && !timedOut) throw err;
        console.warn(`[gemini] ${model} unavailable (${timedOut ? 'timeout' : err.message.slice(0, 90)}), trying next`);
      }
    }
  }
  throw lastErr;
}

/** Calls the configured vision LLM and returns parsed JSON, or throws. */
export async function visionJson(prompt, image, config) {
  if (config.visionProvider === 'openai') return openaiJson(prompt, image, config);
  if (config.visionProvider === 'gemini') return geminiJson(prompt, image, config);
  throw new Error('No vision provider configured');
}

export { toInlineImage };
