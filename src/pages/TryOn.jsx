import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Check, Download, Footprints, Gem, Heart, Info, LoaderCircle, RefreshCw, Scissors, ShoppingBag, Sparkles, WandSparkles, RotateCcw,
} from 'lucide-react';
import { formatPrice } from '../../shared/products.js';
import { AUDIENCES, isIntimate } from '../../shared/taxonomy.js';
import SafetyNotice from '../components/SafetyNotice.jsx';
import { pairingsFor } from '../../shared/pairing.js';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import ProductImage from '../components/ProductImage.jsx';
import PhotoDropzone from '../components/PhotoDropzone.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
import { api } from '../lib/api.js';
import { useObjectUrl } from '../lib/useObjectUrl.js';
import { useStore } from '../context/StoreContext.jsx';

const STAGES = [
  { key: 'tryon', label: 'Mapping body landmarks & draping garment' },
  { key: 'match', label: 'Scoring fit, colour harmony & season' },
  { key: 'style', label: 'Styling your complete look' },
];

function LookBuilder({ product, queued, layers, busyId, onAdd, onUndo, canUndo, warning }) {
  const { products } = useCatalog();
  const recs = pairingsFor(product, products, 3).filter((g) => g.category !== 'Dresses').flatMap((g) => g.items.map((i) => i.product));
  const items = [...queued.filter((q) => q.id !== product.id), ...recs.filter((r) => !queued.some((q) => q.id === r.id))].slice(0, 8);
  if (!items.length) return null;
  return (
    <section className="mt-10 card p-6" data-testid="look-builder">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Complete the look</p>
          <h2 className="mt-1 text-2xl font-semibold">Add matching pieces — only if you want to</h2>
          <p className="mt-1 text-sm text-ink/60">Each piece is added to your current try-on one at a time. Nothing is tried on automatically.</p>
        </div>
        {canUndo && <button onClick={onUndo} className="text-sm font-semibold text-gold-dark underline-offset-2 hover:underline" data-testid="undo-layer">Undo last piece</button>}
      </div>
      {warning && <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-2 text-xs text-amber-800" data-testid="layer-warning">{warning}</p>}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((p) => {
          const added = layers.includes(p.id);
          return (
            <div key={p.id} className="rounded-2xl bg-cream p-3" data-testid={`look-item-${p.id}`}>
              <ProductImage product={p} className="aspect-square rounded-xl" />
              <p className="mt-2 truncate text-sm font-medium">{p.name}</p>
              <p className="text-xs text-ink/50">{p.subCategory} · {formatPrice(p.price)}</p>
              <button disabled={added || !!busyId} onClick={() => onAdd(p)} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-ink px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" data-testid="try-with-look">
                {busyId === p.id ? <LoaderCircle size={14} className="animate-spin" /> : added ? <Check size={14} /> : <WandSparkles size={14} />}
                {added ? 'Added to look' : 'Try-On with Current Look'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const TRYON_BUSY_MESSAGE = 'Our Try-on is busy right now, try again later';
const INPUT_ERRORS = new Set([400, 401, 404, 413, 415, 422]);

const PROVIDER_LABEL = { gemini: 'Google Gemini', openai: 'OpenAI', mock: 'FitStyle style rules' };

function OutfitPicker({ selectedId, onSelect }) {
  const { products: PRODUCTS } = useCatalog();
  const [cat, setCat] = useState('All');
  const list = PRODUCTS.filter((p) => p.category === 'Dresses' && !isIntimate(p) && (cat === 'All' || p.audience === cat));
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {['All', ...AUDIENCES].map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-full px-3 py-1 text-xs font-medium ${c === cat ? 'bg-ink text-white' : 'bg-white text-ink/60 ring-1 ring-ink/10'}`}>{c}</button>
        ))}
      </div>
      <div className="mt-4 grid max-h-[22rem] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4" data-testid="outfit-picker">
        {list.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            aria-pressed={p.id === selectedId}
            title={p.name}
            data-testid={`pick-${p.id}`}
            className={`group relative overflow-hidden rounded-2xl text-left ring-2 transition ${p.id === selectedId ? 'ring-gold' : 'ring-transparent hover:ring-ink/20'}`}
          >
            <ProductImage product={p} className="aspect-[3/4]" />
            {p.id === selectedId && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-gold text-white"><Check size={12} /></span>}
            <span className="block truncate px-1 py-1 text-[11px] font-medium">{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SuggestionColumn({ icon: Icon, title, items, testId }) {
  return (
    <div className="card p-6" data-testid={testId}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sand text-gold-dark"><Icon size={18} /></span>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <ul className="mt-5 space-y-4">
        {items.map((it, i) => (
          <li key={it.name} className="flex gap-3">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-semibold text-white">{i + 1}</span>
            <div>
              <p className="font-medium">{it.name}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink/60">{it.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TryOn() {
  const { products: PRODUCTS, getProduct } = useCatalog();
  const [params, setParams] = useSearchParams();
  const productId = getProduct(params.get('product')) ? params.get('product') : PRODUCTS[0].id;
  const product = getProduct(productId);
  const { addToCart, toggleWishlist, isWishlisted, notify } = useStore();
  const { requireAuth } = useAuth();

  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(null);
  const [stage, setStage] = useState(null);
  const [result, setResult] = useState(null);
  const [match, setMatch] = useState(null);
  const [styling, setStyling] = useState(null);
  const [view, setView] = useState('result');
  const [layers, setLayers] = useState([]);
  const [history, setHistory] = useState([]);
  const [layering, setLayering] = useState(null);
  const queued = (params.get('add') || '').split(',').map((id) => getProduct(id)).filter(Boolean);

  // Image generation failures show one fixed message with Try Again; only bad input (e.g. an unreadable photo) shows its own reason.
  const showTryOnFailure = (err, again) => {
    const badInput = INPUT_ERRORS.has(err.status);
    setError(badInput ? err.message : TRYON_BUSY_MESSAGE);
    setRetry(badInput ? null : () => again);
  };

  const addToLook = async (item) => {
    setLayering(item.id);
    setError(null);
    setRetry(null);
    try {
      const out = await api.layerTryOn(item.id, result.image);
      setHistory((h) => [...h, { image: result.image, layers }]);
      setResult((r) => ({ ...r, image: out.image, layerWarning: out.warning }));
      setLayers((l) => [...l, item.id]);
    } catch (e) {
      showTryOnFailure(e, () => addToLook(item));
    } finally {
      setLayering(null);
    }
  };
  const undoLayer = () => {
    const last = history.at(-1);
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setResult((r) => ({ ...r, image: last.image, layerWarning: undefined }));
    setLayers(last.layers);
  };
  const runId = useRef(0);
  const resultRef = useRef(null);

  const photoUrl = useObjectUrl(photo);

  const reset = () => {
    runId.current++;
    setStage(null);
    setResult(null);
    setLayers([]);
    setHistory([]);
    setMatch(null);
    setStyling(null);
  };

  const selectProduct = (id) => {
    reset();
    setParams({ product: id }, { replace: true });
  };

  const changePhoto = (f) => {
    reset();
    setPhoto(f);
  };

  const runTryOn = async () => {
    if (!photo) return;
    const id = ++runId.current;
    let step = 'tryon';
    setError(null);
    setRetry(null);
    setResult(null);
    setLayers([]);
    setHistory([]);
    setMatch(null);
    setStyling(null);
    setView('result');
    try {
      setStage('tryon');
      const tryOn = await api.tryOn(product.id, photo);
      if (id !== runId.current) return;
      setResult(tryOn);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      step = 'match';
      setStage('match');
      const m = await api.calculateMatch(product.id, tryOn.image);
      if (id !== runId.current) return;
      setMatch(m);
      setStage('style');
      const s = await api.stylingSuggestions(product.id, tryOn.image, { bodyShape: m.bodyShape, skinTone: m.skinTone });
      if (id !== runId.current) return;
      setStyling(s);
      setStage('done');
    } catch (err) {
      if (id !== runId.current) return;
      if (step === 'tryon') showTryOnFailure(err, runTryOn);
      else setError(err.message);
      setStage(null);
    }
  };

  const busy = stage && stage !== 'done';
  const stageIndex = STAGES.findIndex((s) => s.key === stage);
  const warnings = [result?.warning, match?.warning, styling?.warning].filter(Boolean);
  const saved = isWishlisted(product.id);

  return (
    <div className="container-luxe py-12">
      <p className="eyebrow">Try-On Studio</p>
      <h1 className="mt-2 text-4xl font-semibold">Your AI fitting room</h1>
      <p className="mt-2 max-w-2xl text-ink/60">Choose an outfit, upload a full-body photo, and let FitStyle AI show you the fit, score the match and style the complete look.</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="flex items-center gap-2 font-sans text-sm font-semibold uppercase tracking-widest text-ink/50"><span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-xs text-white">1</span>Select your outfit</h2>
            <div className="mt-4 flex items-center gap-4 rounded-2xl bg-cream p-3">
              <ProductImage product={product} className="h-24 w-20 shrink-0 rounded-xl" />
              <div className="min-w-0">
                <p className="font-semibold" data-testid="selected-product">{product.name}</p>
                <p className="text-sm text-ink/60">{product.colorName} · {formatPrice(product.price)}</p>
                <Link to={`/product/${product.id}`} className="text-xs font-medium text-gold-dark underline-offset-2 hover:underline">View details</Link>
              </div>
            </div>
            <div className="mt-5"><OutfitPicker selectedId={product.id} onSelect={selectProduct} /></div>
          </section>

          <section className="card p-6">
            <h2 className="flex items-center gap-2 font-sans text-sm font-semibold uppercase tracking-widest text-ink/50"><span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-xs text-white">2</span>Upload your photo</h2>
            {isIntimate(product) ? (
              <div className="mt-4 space-y-4">
                <SafetyNotice compact />
                <ProductImage product={product} className="mx-auto aspect-[3/4] max-w-xs rounded-2xl" />
              </div>
            ) : (
              <div className="mt-4"><PhotoDropzone file={photo} onChange={changePhoto} onError={(m) => { setError(m); setRetry(null); }} /></div>
            )}
            <p className="mt-3 flex items-start gap-2 text-xs text-ink/50"><Info size={14} className="mt-0.5 shrink-0" />Best results: stand facing the camera, arms relaxed, plain background, good lighting. Photos are processed only to generate your try-on.</p>
          </section>

          <button onClick={() => requireAuth(runTryOn, 'Log in or sign up to use the Virtual Try-On.')} disabled={!photo || busy || isIntimate(product)} className="btn-gold w-full py-4 text-base" data-testid="try-on-button">
            {busy ? <LoaderCircle size={18} className="animate-spin" /> : <WandSparkles size={18} />}
            {busy ? 'Creating your look…' : result ? 'Try On Again' : 'Try On'}
          </button>
          {!photo && <p className="-mt-3 text-center text-xs text-ink/50">Upload a photo to enable Try On</p>}
          {error && (
            <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" data-testid="try-on-error">
              <p>{error}</p>
              {retry && !busy && !layering && (
                <button type="button" onClick={retry} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800" data-testid="try-again">
                  <RotateCcw size={14} /> Try Again
                </button>
              )}
            </div>
          )}
        </div>

        <section ref={resultRef} className="card flex min-h-[32rem] flex-col p-6 scroll-mt-24" aria-live="polite">
          {!stage && !result && (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <span className="grid h-16 w-16 place-items-center rounded-3xl bg-sand text-gold-dark"><Sparkles size={28} /></span>
              <h3 className="mt-5 text-2xl font-semibold">Your look will appear here</h3>
              <p className="mt-2 max-w-sm text-sm text-ink/60">Select an outfit and upload a photo, then press <strong>Try On</strong> to see the AI-generated result and your match score.</p>
            </div>
          )}

          {stage === 'tryon' && (
            <div className="flex flex-1 flex-col">
              <div className="skeleton flex-1" />
            </div>
          )}

          {result && (
            <div className="flex flex-1 flex-col">
              <div className="mb-3 flex items-center justify-between">
                <div className="inline-flex rounded-full bg-cream p-1 text-xs font-semibold">
                  {['result', 'original', 'compare'].map((v) => (
                    <button key={v} onClick={() => setView(v)} className={`rounded-full px-3 py-1.5 capitalize ${view === v ? 'bg-ink text-white' : 'text-ink/60'}`}>{v === 'result' ? 'AI Try-On' : v}</button>
                  ))}
                </div>
                <span className="chip">
                  {PROVIDER_LABEL[result.provider] || result.provider}
                  {result.model ? ` · ${result.model.split('/').pop()}` : ''}
                </span>
              </div>
              <div className={`grid flex-1 gap-3 ${view === 'compare' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {(view === 'original' || view === 'compare') && (
                  <figure className="overflow-hidden rounded-2xl bg-sand">
                    <img src={photoUrl} alt="Original upload" className="h-full max-h-[30rem] w-full object-contain" />
                  </figure>
                )}
                {(view === 'result' || view === 'compare') && (
                  <figure className="overflow-hidden rounded-2xl bg-sand">
                    <img src={result.image} alt={`You wearing the ${product.name}`} className="h-full max-h-[30rem] w-full object-contain" data-testid="try-on-result" />
                  </figure>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => requireAuth(() => { addToCart(product.id, 'M'); notify(`Added ${product.name} to your bag`); }, 'Log in or sign up to add items to your bag.')} className="btn-primary flex-1 py-2.5"><ShoppingBag size={15} />Add to Cart</button>
                <button onClick={() => { toggleWishlist(product.id); notify(saved ? 'Removed from wishlist' : 'Saved to wishlist'); }} className="btn-outline py-2.5" aria-pressed={saved}><Heart size={15} className={saved ? 'fill-gold text-gold' : ''} /></button>
                <a href={result.image} download={`fitstyle-${product.id}.jpg`} target="_blank" rel="noreferrer" className="btn-outline py-2.5" aria-label="Download try-on image"><Download size={15} /></a>
                <button onClick={reset} className="btn-outline py-2.5" aria-label="Start over"><RefreshCw size={15} /></button>
              </div>
            </div>
          )}

          {busy && (
            <ol className="mt-5 space-y-2" data-testid="progress">
              {STAGES.map((s, i) => (
                <li key={s.key} className={`flex items-center gap-2 text-sm ${i <= stageIndex ? 'text-ink' : 'text-ink/40'}`}>
                  {i < stageIndex ? <Check size={16} className="text-gold-dark" /> : i === stageIndex ? <LoaderCircle size={16} className="animate-spin text-gold-dark" /> : <span className="h-4 w-4 rounded-full border border-ink/20" />}
                  {s.label}
                </li>
              ))}
              <li className="pt-1 text-xs text-ink/40">AI try-on usually takes 10–60 seconds.</li>
            </ol>
          )}
        </section>
      </div>

      {warnings.length > 0 && (
        <div className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{warnings.join(' ')}</div>
      )}

      {result && (
        <LookBuilder product={product} queued={queued} layers={layers} busyId={layering} onAdd={addToLook} onUndo={undoLayer} canUndo={history.length > 0} warning={result.layerWarning} />
      )}

      {match && (
        <section className="mt-10 card grid gap-8 p-8 lg:grid-cols-[auto_1fr]" data-testid="match-section">
          <div className="flex flex-col items-center text-center lg:w-64">
            <ScoreRing score={match.score} />
            <h2 className="mt-4 text-xl font-semibold leading-snug" data-testid="match-headline">{match.headline}</h2>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {match.bodyShape && <span className="chip capitalize">Silhouette: {match.bodyShape}</span>}
              {match.skinTone && <span className="chip capitalize">Tone: {match.skinTone}</span>}
            </div>
            <p className="mt-3 text-[11px] text-ink/40">Scored by {PROVIDER_LABEL[match.provider] || match.provider}</p>
          </div>
          <div>
            <p className="eyebrow">Why this works</p>
            <ul className="mt-4 space-y-5">
              {match.breakdown.map((b) => (
                <li key={b.label} data-testid="breakdown-item">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{b.label}</span>
                    <span className="font-semibold text-gold-dark">{b.score}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-sand">
                    <div className="h-full rounded-full bg-gradient-to-r from-gold-light to-gold-dark transition-all duration-1000" style={{ width: `${b.score}%` }} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink/60">{b.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {(stage === 'style' || styling) && (
        <section className="mt-10" data-testid="complete-look">
          <p className="eyebrow">Finish the outfit</p>
          <h2 className="mt-2 text-3xl font-semibold">AI Complete Look Suggestions</h2>
          {styling?.stylistNote && <p className="mt-2 max-w-3xl text-ink/60">{styling.stylistNote}</p>}
          {styling ? (
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <SuggestionColumn icon={Scissors} title="Recommended Hairstyles" items={styling.hairstyles} testId="hairstyles" />
              <SuggestionColumn icon={Gem} title="Recommended Accessories" items={styling.accessories} testId="accessories" />
              <SuggestionColumn icon={Footprints} title="Recommended Footwear" items={styling.footwear} testId="footwear" />
            </div>
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-72" />)}</div>
          )}
        </section>
      )}
    </div>
  );
}
