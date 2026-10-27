import { PRODUCTS, getProduct } from '../../shared/products.js';

const tokenize = (s) => String(s).toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);

function productTokens(p) {
  return new Set(tokenize([p.name, p.type, p.colorName, p.style, p.palette, p.fabric, p.pattern, ...p.categories].join(' ')));
}

/**
 * Content-based recommender: builds a preference profile from wishlist, cart
 * and search history and ranks catalogue dresses by affinity.
 */
export function recommend({ wishlist = [], cart = [], searches = [] } = {}, limit = 8) {
  const weights = new Map();
  const bump = (key, w) => weights.set(key, (weights.get(key) || 0) + w);
  const seen = new Set([...wishlist, ...cart]);
  const signals = [];

  for (const [ids, w, source] of [[wishlist, 3, 'wishlist'], [cart, 4, 'cart']]) {
    for (const id of ids) {
      const p = getProduct(id);
      if (!p) continue;
      signals.push({ source, label: p.name });
      bump(`style:${p.style}`, w);
      bump(`palette:${p.palette}`, w * 0.6);
      bump(`type:${p.type}`, w * 0.8);
      p.categories.forEach((c) => bump(`cat:${c}`, w * 0.7));
      p.seasons.forEach((s) => bump(`season:${s}`, w * 0.2));
    }
  }
  const searchTokens = searches.flatMap((q) => {
    signals.push({ source: 'search', label: q });
    return tokenize(q);
  });

  const candidates = PRODUCTS.filter((p) => p.categories.includes('Dresses'));
  const scored = candidates.map((p) => {
    let score = 0;
    const reasons = [];
    const add = (key, label) => {
      const w = weights.get(key) || 0;
      if (w > 0) { score += w; reasons.push([w, label]); }
    };
    add(`style:${p.style}`, `Matches your love of ${p.style} styles`);
    add(`palette:${p.palette}`, `In the ${p.palette} palette you gravitate towards`);
    add(`type:${p.type}`, `A ${p.type} silhouette like pieces you saved`);
    p.categories.forEach((c) => add(`cat:${c}`, `Aligned with the ${c.toLowerCase()} pieces you love`));
    p.seasons.forEach((s) => add(`season:${s}`, `Perfect for ${s}`));
    const toks = productTokens(p);
    const hits = searchTokens.filter((t) => toks.has(t) || [...toks].some((pt) => pt.startsWith(t)));
    if (hits.length) {
      score += hits.length * 5;
      reasons.push([hits.length * 5, `Matches your search for "${hits[0]}"`]);
    }
    score += p.rating; // tie-break on quality
    if (seen.has(p.id)) score -= 6; // favour discovery
    reasons.sort((a, b) => b[0] - a[0]);
    return {
      productId: p.id,
      score: Math.round(score * 10) / 10,
      reason: reasons.length ? `${reasons[0][1]}.` : 'A highly rated customer favourite.',
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const max = scored[0]?.score || 1;
  return {
    items: scored.slice(0, limit).map((s) => ({ ...s, matchPercent: Math.round(70 + (s.score / max) * 28) })),
    signals,
    personalized: signals.length > 0,
  };
}
