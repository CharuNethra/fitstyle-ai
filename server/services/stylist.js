import { analyzePhoto, dataUrlToBuffer, hashBuffer, hexToRgb, luminanceOf } from './imageUtils.js';
import { visionJson, toInlineImage } from './vision.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function currentSeason(date = new Date()) {
  const m = date.getMonth();
  if (m <= 1 || m === 11) return 'winter';
  if (m <= 4) return 'spring';
  if (m <= 7) return 'summer';
  return 'autumn';
}

async function imageBuffer(image) {
  if (!image) return null;
  const buf = dataUrlToBuffer(image);
  if (buf) return buf;
  const inline = await toInlineImage(image);
  return Buffer.from(inline.data, 'base64');
}

function describeTone(rgb) {
  const lum = luminanceOf(rgb);
  const warmth = rgb[0] - rgb[2];
  const depth = lum > 0.68 ? 'fair' : lum > 0.5 ? 'light-medium' : lum > 0.34 ? 'medium' : 'deep';
  const undertone = warmth > 45 ? 'warm' : warmth < 18 ? 'cool' : 'neutral';
  return { depth, undertone, lum, label: `${depth} ${undertone}` };
}

function describeSilhouette(box, detected) {
  if (!detected) return 'balanced';
  const ratio = box.h / Math.max(0.01, box.w);
  if (ratio > 3.6) return 'elongated';
  if (ratio > 2.6) return 'balanced';
  return 'curvy';
}

const FIT_RULES = {
  elongated: { gown: 96, coat: 94, dress: 90, blazer: 88, knit: 86, top: 84, tee: 84, jacket: 85 },
  balanced: { dress: 93, gown: 91, blazer: 91, coat: 90, top: 89, tee: 87, knit: 88, jacket: 88 },
  curvy: { dress: 94, gown: 90, blazer: 92, coat: 88, top: 86, tee: 83, knit: 84, jacket: 86 },
};

/** Deterministic rule-based fashion scoring used when no LLM key is configured. */
export async function mockMatch(product, image) {
  const buf = await imageBuffer(image);
  const analysis = buf ? await analyzePhoto(buf) : null;
  const jitter = buf ? (hashBuffer(buf) % 7) - 3 : 0;
  const tone = describeTone(analysis?.toneRgb || [205, 165, 140]);
  const silhouette = describeSilhouette(analysis?.box || { w: 0.3, h: 0.9 }, analysis?.detected);
  const garmentLum = luminanceOf(hexToRgb(product.color));
  const contrast = Math.abs(garmentLum - tone.lum);
  const season = currentSeason();

  const fit = clamp((FIT_RULES[silhouette][product.type] || 88) + jitter, 60, 99);

  let harmony;
  if (product.palette === 'neutral') harmony = 91;
  else if (product.palette === tone.undertone) harmony = 95;
  else if (tone.undertone === 'neutral') harmony = 89;
  else harmony = 78;
  harmony = clamp(harmony - jitter, 60, 99);

  const contrastScore = clamp(Math.round(72 + contrast * 60), 65, 97);
  const seasonal = product.seasons.includes(season) ? 95 : 76;
  const versatility = product.categories.length > 1 ? 90 : 84;

  const score = Math.round(fit * 0.32 + harmony * 0.26 + contrastScore * 0.18 + seasonal * 0.14 + versatility * 0.1);
  const contrastWord = contrast > 0.35 ? 'striking' : contrast > 0.18 ? 'balanced' : 'soft tonal';

  return {
    score,
    headline: `${score}% Match for your ${silhouette} silhouette and ${tone.undertone} tone`,
    bodyShape: silhouette,
    skinTone: tone.label,
    breakdown: [
      {
        label: 'Fit & Silhouette',
        score: fit,
        detail: `The ${product.type === 'gown' ? 'floor-length line' : product.type === 'dress' ? 'defined waist and flowing hem' : 'tailored shoulder and clean drape'} of the ${product.name} complements a ${silhouette} frame${silhouette === 'curvy' ? ' by highlighting the waist' : silhouette === 'elongated' ? ' by enhancing your natural length' : ' with balanced proportions'}.`,
      },
      {
        label: 'Color Harmony',
        score: harmony,
        detail: product.palette === 'neutral'
          ? `${product.colorName} is a versatile neutral that flatters virtually every undertone, including your ${tone.undertone} undertone.`
          : product.palette === tone.undertone
            ? `${product.colorName} shares your ${tone.undertone} undertone, creating a naturally radiant, harmonious effect.`
            : `${product.colorName} is a ${product.palette} shade — a bold counterpoint to your ${tone.undertone} undertone. Balance it with ${tone.undertone === 'warm' ? 'gold' : 'silver'} accents.`,
      },
      {
        label: 'Color Contrast',
        score: contrastScore,
        detail: `The garment-to-complexion contrast reads as ${contrastWord}, which ${contrast > 0.18 ? 'draws the eye and makes the outfit pop' : 'creates an elegant, monochrome-inspired look'}.`,
      },
      {
        label: 'Seasonal Compatibility',
        score: seasonal,
        detail: product.seasons.includes(season)
          ? `${product.fabric} is perfectly suited to ${season} — ideal for wearing right now.`
          : `Best suited to ${product.seasons.join(', ')}; layer thoughtfully to wear it this ${season}.`,
      },
      {
        label: 'Style Versatility',
        score: versatility,
        detail: `Works across ${product.categories.join(' & ').toLowerCase()} occasions and pairs effortlessly with your existing wardrobe.`,
      },
    ],
  };
}

const HAIR = {
  evening: [
    { name: 'Sleek High Bun', description: 'Pulls focus to the neckline and shoulders for a refined evening finish.' },
    { name: 'Old-Hollywood Waves', description: 'Glamorous sculpted waves echo the luxe drape of the fabric.' },
    { name: 'Low Chignon', description: 'An elegant, effortless updo that keeps the silhouette clean.' },
  ],
  work: [
    { name: 'Polished Low Ponytail', description: 'Sleek and confident — keeps the tailored lines in focus.' },
    { name: 'Soft Blowout', description: 'Voluminous, bouncy ends add polish without fuss.' },
    { name: 'Tucked French Twist', description: 'A timeless boardroom-to-dinner updo.' },
  ],
  casual: [
    { name: 'Loose Beach Waves', description: 'Relaxed, touchable texture matches the easy-going vibe.' },
    { name: 'Messy Top Knot', description: 'Effortless and practical with a fashion-forward edge.' },
    { name: 'Half-Up Claw Clip', description: 'On-trend and laid-back while framing the face.' },
  ],
  boho: [
    { name: 'Braided Crown', description: 'A romantic, free-spirited touch that suits flowing fabrics.' },
    { name: 'Loose Waves with Scarf', description: 'Tie a silk scarf through soft waves for bohemian flair.' },
    { name: 'Undone Fishtail Braid', description: 'Textured and carefree — perfect for sunny days.' },
  ],
};

const ACCESSORIES = {
  evening: ['Statement Drop Earrings', 'Satin Mini Clutch', 'Delicate Tennis Bracelet'],
  work: ['Structured Leather Tote', 'Classic Pearl Studs', 'Slim Leather Watch'],
  casual: ['Woven Crossbody Bag', 'Layered Pendant Necklaces', 'Oversized Sunglasses'],
  boho: ['Raffia Bucket Bag', 'Stacked Bangles', 'Wide-Brim Straw Hat'],
};

const FOOTWEAR = {
  evening: [
    { name: 'Pointed Stiletto Heels', description: 'Lengthen the leg line and elevate the formality.' },
    { name: 'Strappy Heeled Sandals', description: 'Delicate straps keep the look light and elegant.' },
    { name: 'Embellished Block Heels', description: 'Comfortable all-night glamour with sparkle.' },
  ],
  work: [
    { name: 'Classic Leather Pumps', description: 'Timeless and polished for any professional setting.' },
    { name: 'Pointed Slingback Kitten Heels', description: 'Refined height with all-day comfort.' },
    { name: 'Leather Loafers', description: 'Modern menswear-inspired ease.' },
  ],
  casual: [
    { name: 'Clean White Sneakers', description: 'Fresh, versatile and effortlessly cool.' },
    { name: 'Leather Slide Sandals', description: 'Minimal and easy for warm-weather days.' },
    { name: 'Ankle Boots', description: 'Adds edge and works across seasons.' },
  ],
  boho: [
    { name: 'Espadrille Wedges', description: 'Summery height that pairs with flowing hems.' },
    { name: 'Strappy Flat Sandals', description: 'Breezy, barely-there and festival-ready.' },
    { name: 'Suede Knee Boots', description: 'A 70s-inspired finish for cooler evenings.' },
  ],
};

/** Rule-based complete-look stylist used when no LLM key is configured. */
export function mockStyling(product, match) {
  const style = HAIR[product.style] ? product.style : 'casual';
  const metal = product.palette === 'cool' ? 'Silver' : product.palette === 'warm' ? 'Gold' : (match?.skinTone || '').includes('cool') ? 'Silver' : 'Gold';
  const accessories = ACCESSORIES[style].map((name, i) => ({
    name: i === 0 ? `${metal} ${name}` : name,
    description: i === 0
      ? `${metal} tones harmonise with ${product.colorName.toLowerCase()} and your complexion.`
      : `Completes the ${style} mood of the ${product.name} without competing with it.`,
  }));
  return {
    hairstyles: HAIR[style],
    accessories,
    footwear: FOOTWEAR[style],
    stylistNote: `For a cohesive ${style} look, let the ${product.colorName.toLowerCase()} ${product.type} be the hero and keep accents in ${metal.toLowerCase()} and soft neutrals.`,
  };
}

function productBrief(product) {
  return `${product.name} — ${product.type}, colour ${product.colorName} (${product.color}), ${product.pattern} pattern, fabric ${product.fabric}, style ${product.style}, seasons ${product.seasons.join('/')}, categories ${product.categories.join('/')}.`;
}

export async function calculateMatch(product, image, config) {
  if (config.visionProvider === 'mock') return { ...(await mockMatch(product, image)), provider: 'mock' };
  const prompt = `Analyse this virtual try-on image of a person wearing: ${productBrief(product)}
Today's season (northern hemisphere): ${currentSeason()}.
Evaluate against fashion rules (fit/silhouette, colour harmony with skin undertone, colour contrast, seasonal compatibility, versatility).
Return JSON: {"score": integer 0-100, "headline": "e.g. 88% Match for your hourglass shape and warm tone", "bodyShape": string, "skinTone": string, "breakdown": [{"label": string, "score": integer 0-100, "detail": one sentence}] (exactly 5 items with labels Fit & Silhouette, Color Harmony, Color Contrast, Seasonal Compatibility, Style Versatility)}`;
  try {
    const json = await visionJson(prompt, image, config);
    const score = Number(json.score);
    if (!Number.isFinite(score) || !Array.isArray(json.breakdown) || !json.breakdown.length) throw new Error('Malformed AI response');
    const rounded = clamp(Math.round(score), 0, 100);
    return {
      score: rounded,
      headline: String(json.headline || `${rounded}% Match for your body shape and tone`),
      bodyShape: String(json.bodyShape || 'balanced'),
      skinTone: String(json.skinTone || 'medium'),
      breakdown: json.breakdown.slice(0, 5).map((b) => ({
        label: String(b.label || 'Style'),
        score: clamp(Math.round(Number(b.score) || rounded), 0, 100),
        detail: String(b.detail || ''),
      })),
      provider: config.visionProvider,
    };
  } catch (err) {
    console.warn('[match] AI provider failed, using rule engine:', err.message);
    return { ...(await mockMatch(product, image)), provider: 'mock', warning: 'AI scoring unavailable — showing rule-based score.' };
  }
}

export async function stylingSuggestions(product, image, config, match) {
  if (config.visionProvider === 'mock') return { ...mockStyling(product, match), provider: 'mock' };
  const prompt = `You are styling a complete look around: ${productBrief(product)}
${match ? `The client's estimated body shape is ${match.bodyShape} and skin tone ${match.skinTone}.` : ''}
Using the attached try-on image (if present), recommend complementary items.
Return JSON: {"hairstyles": [{"name": string, "description": one sentence}] x3, "accessories": [{"name","description"}] x3, "footwear": [{"name","description"}] x3, "stylistNote": one sentence}`;
  try {
    const json = await visionJson(prompt, image, config);
    const items = (list) => (Array.isArray(list) ? list : [])
      .map((it) => (typeof it === 'string' ? { name: it, description: '' } : { name: String(it?.name || ''), description: String(it?.description || '') }))
      .filter((it) => it.name)
      .slice(0, 3);
    const out = { hairstyles: items(json.hairstyles), accessories: items(json.accessories), footwear: items(json.footwear) };
    if (!out.hairstyles.length || !out.accessories.length || !out.footwear.length) throw new Error('Malformed AI response');
    return { ...out, stylistNote: String(json.stylistNote || ''), provider: config.visionProvider };
  } catch (err) {
    console.warn('[styling] AI provider failed, using rule engine:', err.message);
    return { ...mockStyling(product, match), provider: 'mock', warning: 'AI stylist unavailable — showing curated suggestions.' };
  }
}
