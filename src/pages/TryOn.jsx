import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Check, Download, Footprints, Gem, Heart, Info, LoaderCircle, RefreshCw, Scissors, ShoppingBag, Sparkles, WandSparkles,
} from 'lucide-react';
import { CATEGORIES, PRODUCTS, formatPrice, getProduct } from '../../shared/products.js';
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

const PROVIDER_LABEL = { mock: 'FitStyle preview engine', huggingface: 'Hugging Face', fal: 'Fal.ai · FASHN', fashn: 'FASHN', openai: 'OpenAI', gemini: 'Google Gemini' };

function OutfitPicker({ selectedId, onSelect }) {
  const [cat, setCat] = useState('All');
  const list = PRODUCTS.filter((p) => cat === 'All' || p.categories.includes(cat));
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
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
  const [params, setParams] = useSearchParams();
  const productId = getProduct(params.get('product')) ? params.get('product') : PRODUCTS[0].id;
  const product = getProduct(productId);
  const { addToCart, toggleWishlist, isWishlisted, notify } = useStore();

  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState(null);
  const [result, setResult] = useState(null);
  const [match, setMatch] = useState(null);
  const [styling, setStyling] = useState(null);
  const [view, setView] = useState('result');
  const runId = useRef(0);
  const resultRef = useRef(null);

  const photoUrl = useObjectUrl(photo);

  const reset = () => {
    runId.current++;
    setStage(null);
    setResult(null);
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
    setError(null);
    setResult(null);
    setMatch(null);
    setStyling(null);
    setView('result');
    try {
      setStage('tryon');
      const tryOn = await api.tryOn(product.id, photo);
      if (id !== runId.current) return;
      setResult(tryOn);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
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
      setError(err.message);
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
            <div className="mt-4"><PhotoDropzone file={photo} onChange={changePhoto} onError={setError} /></div>
            <p className="mt-3 flex items-start gap-2 text-xs text-ink/50"><Info size={14} className="mt-0.5 shrink-0" />Best results: stand facing the camera, arms relaxed, plain background, good lighting. Photos are processed only to generate your try-on.</p>
          </section>

          <button onClick={runTryOn} disabled={!photo || busy} className="btn-gold w-full py-4 text-base" data-testid="try-on-button">
            {busy ? <LoaderCircle size={18} className="animate-spin" /> : <WandSparkles size={18} />}
            {busy ? 'Creating your look…' : result ? 'Try On Again' : 'Try On'}
          </button>
          {!photo && <p className="-mt-3 text-center text-xs text-ink/50">Upload a photo to enable Try On</p>}
          {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" data-testid="try-on-error">{error}</p>}
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
                <button onClick={() => { addToCart(product.id, 'M'); notify(`Added ${product.name} to your bag`); }} className="btn-primary flex-1 py-2.5"><ShoppingBag size={15} />Add to Cart</button>
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
