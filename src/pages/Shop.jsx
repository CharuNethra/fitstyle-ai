import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { AUDIENCES, PRODUCT_CATEGORIES, SUBCATEGORIES } from '../../shared/taxonomy.js';
import { useCatalog } from '../context/CatalogContext.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { useStore } from '../context/StoreContext.jsx';

const SORTS = {
  featured: { label: 'Featured', fn: () => 0 },
  'price-asc': { label: 'Price: Low to High', fn: (a, b) => a.price - b.price },
  'price-desc': { label: 'Price: High to Low', fn: (a, b) => b.price - a.price },
  rating: { label: 'Top Rated', fn: (a, b) => b.rating - a.rating },
};

function matches(p, q) {
  const hay = [p.name, p.colorName, p.type, p.style, p.fabric, p.pattern, p.audience, p.subCategory, ...(p.categories || [])].join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
}

function FilterRow({ label, options, value, onChange, testId, small = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-widest text-ink/40">{label}</span>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label={label} data-testid={testId}>
        {options.map((o) => (
          <button
            key={o}
            role="tab"
            aria-selected={o === value}
            onClick={() => onChange(o)}
            className={`shrink-0 whitespace-nowrap rounded-full font-medium transition ${small ? 'px-4 py-1.5 text-xs' : 'px-5 py-2 text-sm'} ${
              o === value ? 'bg-ink text-white' : 'border border-ink/10 bg-white text-ink/70 hover:border-ink/40'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Shop() {
  const { products: PRODUCTS } = useCatalog();
  const [params, setParams] = useSearchParams();
  const { recordSearch } = useStore();
  const audience = AUDIENCES.includes(params.get('audience')) ? params.get('audience') : 'All';
  const category = PRODUCT_CATEGORIES.includes(params.get('category')) ? params.get('category') : 'All';
  const styles = category === 'All' ? [] : SUBCATEGORIES[category];
  const style = styles.includes(params.get('style')) ? params.get('style') : 'All';
  const q = params.get('q') || '';
  const sort = SORTS[params.get('sort')] ? params.get('sort') : 'featured';
  const [draft, setDraft] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  if (q !== lastQ) {
    setLastQ(q);
    setDraft(q);
  }

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  const products = useMemo(
    () => PRODUCTS.filter((p) => (audience === 'All' || p.audience === audience)
      && (category === 'All' || p.category === category)
      && (style === 'All' || p.subCategory === style))
      .filter((p) => !q || matches(p, q))
      .sort(SORTS[sort].fn),
    [PRODUCTS, audience, category, style, q, sort],
  );

  const submit = (e) => {
    e.preventDefault();
    if (draft.trim()) recordSearch(draft);
    update({ q: draft.trim() });
  };

  return (
    <div className="container-luxe py-12">
      <p className="eyebrow">The collection</p>
      <h1 className="mt-2 text-4xl font-semibold" data-testid="shop-title">
        {[audience, category, style].filter((x) => x !== 'All').join(' · ') || 'Shop all'}
      </h1>

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3" data-testid="filter-tree">
          <FilterRow label="Audience" testId="tier-audience" options={['All', ...AUDIENCES]} value={audience} onChange={(v) => update({ audience: v === 'All' ? '' : v })} />
          <FilterRow label="Category" testId="tier-category" options={['All', ...PRODUCT_CATEGORIES]} value={category} onChange={(v) => update({ category: v === 'All' ? '' : v, style: '' })} />
          {styles.length > 0 && (
            <FilterRow label={category === 'Dresses' ? 'Style' : 'Type'} testId="tier-style" options={['All', ...styles]} value={style} onChange={(v) => update({ style: v === 'All' ? '' : v })} small />
          )}
        </div>
        <div className="flex gap-3">
          <form onSubmit={submit} className="relative flex-1 lg:w-72" role="search">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search the collection" className="input rounded-full py-2.5 pl-9" aria-label="Search the collection" data-testid="shop-search" />
          </form>
          <label className="relative">
            <SlidersHorizontal size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50" />
            <select value={sort} onChange={(e) => update({ sort: e.target.value === 'featured' ? '' : e.target.value })} className="input appearance-none rounded-full py-2.5 pl-8 pr-6" aria-label="Sort products">
              {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {q && (
        <div className="mt-6 flex items-center gap-2 text-sm text-ink/60">
          Showing results for <span className="chip font-semibold text-ink">“{q}”<button aria-label="Clear search" onClick={() => update({ q: '' })}><X size={12} /></button></span>
        </div>
      )}

      <p className="mt-6 text-sm text-ink/50" data-testid="result-count">{products.length} {products.length === 1 ? 'piece' : 'pieces'}</p>
      {products.length ? (
        <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <div className="card mt-6 p-12 text-center">
          <h3 className="text-xl font-semibold">No pieces match your search</h3>
          <p className="mt-2 text-sm text-ink/60">Try a different colour, style or category.</p>
        </div>
      )}
    </div>
  );
}
