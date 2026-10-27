import { dataUrlToBuffer } from './imageUtils.js';

function extractJson(text) {
  const cleaned = String(text).replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function toInlineImage(image) {
  const buf = dataUrlToBuffer(image);
  if (buf) return { mime: image.slice(5, image.indexOf(';')), data: buf.toString('base64') };
  const res = await fetch(image);
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

async function geminiJson(prompt, image, config) {
  const parts = [{ text: prompt }];
  if (image) {
    const inline = await toInlineImage(image);
    parts.push({ inline_data: { mime_type: inline.mime, data: inline.data } });
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return extractJson(json.candidates[0].content.parts.map((p) => p.text || '').join(''));
}

/** Calls the configured vision LLM and returns parsed JSON, or throws. */
export async function visionJson(prompt, image, config) {
  if (config.visionProvider === 'openai') return openaiJson(prompt, image, config);
  if (config.visionProvider === 'gemini') return geminiJson(prompt, image, config);
  throw new Error('No vision provider configured');
}

export { toInlineImage };
