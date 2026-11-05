// Deterministic cross-category pairing: Dresses ↔ Footwear ↔ Accessories.
import { PRODUCT_CATEGORIES, isIntimate } from './taxonomy.js';

const OCCASION_STYLE = { Bridal: 'evening', Groom: 'evening', Party: 'evening', Ethnic: 'evening', Office: 'work', Casual: 'casual', Beachy: 'boho' };
const STYLE_FRIENDS = { evening: ['evening'], work: ['work', 'casual'], casual: ['casual', 'boho', 'work'], boho: ['boho', 'casual'] };
const MOOD = { evening: 'evening', work: 'office-ready', casual: 'easy everyday', boho: 'relaxed holiday' };

const moodOf = (p) => OCCASION_STYLE[p.subCategory] || p.style;

export const complementaryCategories = (category) =>
  PRODUCT_CATEGORIES.filter((c) => c !== (PRODUCT_CATEGORIES.includes(category) ? category : 'Dresses'));

export function pairScore(base, p) {
  let s = 0;
  const a = moodOf(base);
  const b = moodOf(p);
  if (a === b) s += 3;
  else if (STYLE_FRIENDS[a]?.includes(b)) s += 1.5;
  if (p.palette === base.palette || p.palette === 'neutral' || base.palette === 'neutral') s += 1;
  if (p.seasons?.some((x) => base.seasons?.includes(x))) s += 0.5;
  return s + (p.rating || 0) / 10;
}

export function pairReason(base, p) {
  const parts = [];
  if (moodOf(base) === moodOf(p)) parts.push(`Same ${MOOD[moodOf(p)] || moodOf(p)} mood`);
  if (p.palette === 'neutral') parts.push('neutral tone goes with anything');
  else if (p.palette === base.palette) parts.push(`${p.palette} palette match`);
  return parts.length ? parts.join(' · ') : `Balances the ${base.colorName.toLowerCase()} ${base.category === 'Dresses' ? 'outfit' : base.subCategory.toLowerCase()}`;
}

export function pairingsFor(base, products, perCategory = 4) {
  if (!base || isIntimate(base)) return [];
  return complementaryCategories(base.category).map((category) => ({
    category,
    items: products
      .filter((p) => p.category === category && p.id !== base.id && p.audience === base.audience && !isIntimate(p))
      .map((p) => ({ product: p, score: pairScore(base, p) }))
      .sort((x, y) => y.score - x.score)
      .slice(0, perCategory)
      .map(({ product }) => ({ product, reason: pairReason(base, product) })),
  }));
}
