import { PRODUCTS } from '../shared/products.js';

/** Built-in catalogue merged with admin edits (added, updated, removed) and sale tags. */
export function listProducts(store) {
  const { added, updated, removed } = store.data.catalog;
  const gone = new Set(removed);
  const tags = store.data.offers.saleTags;
  return [...PRODUCTS, ...added]
    .filter((p) => !gone.has(p.id))
    .map((p) => {
      const merged = { ...p, ...updated[p.id] };
      if (tags[p.id]) merged.saleTag = tags[p.id];
      return merged;
    });
}

export const findProduct = (store, id) => listProducts(store).find((p) => p.id === id);
