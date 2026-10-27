import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeOff, Heart, LoaderCircle, Search, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';
import { getProduct } from '../../shared/products.js';
import ConsentModal from '../components/ConsentModal.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { api } from '../lib/api.js';
import { useStore } from '../context/StoreContext.jsx';

const SIGNAL_ICON = { wishlist: Heart, cart: ShoppingBag, search: Search };

export default function ForYou() {
  const { consent, interactions, grantConsent, denyConsent, resetConsent, notify } = useStore();
  const [modalOpen, setModalOpen] = useState(consent !== 'granted' && consent !== 'denied');
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (consent !== 'granted') return undefined;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    api.recommendations(interactions)
      .then((r) => !cancelled && setRecs(r))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [consent, interactions]);

  const yes = () => {
    grantConsent();
    setModalOpen(false);
  };
  const no = () => {
    denyConsent();
    setRecs(null);
    setModalOpen(false);
    notify('Preferences cleared — recommendations are off', 'info');
  };
  const askAgain = () => {
    resetConsent();
    setModalOpen(true);
  };

  return (
    <div className="container-luxe py-12">
      <p className="eyebrow">For you</p>
      <h1 className="mt-2 text-4xl font-semibold">Personalized dress recommendations</h1>

      <ConsentModal open={modalOpen} onYes={yes} onNo={no} onClose={() => setModalOpen(false)} />

      {consent === 'granted' ? (
        <section className="mt-6" data-testid="recommendations">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-2xl text-ink/60">
              {recs?.personalized
                ? 'Curated by FitStyle AI from your recent wishlist, bag and searches.'
                : 'We don’t have much history yet — here are our most-loved dresses. Save, add to bag or search to personalize further.'}
            </p>
            <button onClick={no} className="btn-outline px-4 py-2 text-xs" data-testid="turn-off-recs"><EyeOff size={14} />Turn off & clear preferences</button>
          </div>
          {recs?.signals?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2" data-testid="signals">
              {recs.signals.slice(0, 10).map((s, i) => {
                const Icon = SIGNAL_ICON[s.source] || Sparkles;
                return <span key={`${s.source}-${s.label}-${i}`} className="chip"><Icon size={12} />{s.label}</span>;
              })}
            </div>
          )}
          {loading && !recs && <p className="mt-10 flex items-center gap-2 text-ink/60"><LoaderCircle size={16} className="animate-spin" />Curating your edit…</p>}
          {error && <p role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {recs && (
            <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4" data-testid="recommendation-grid">
              {recs.items.map((r) => {
                const p = getProduct(r.productId);
                return p ? <ProductCard key={p.id} product={p} badge={`${r.matchPercent}% match`} note={r.reason} /> : null;
              })}
            </div>
          )}
        </section>
      ) : (
        <section className="card mt-8 flex flex-col items-center p-12 text-center" data-testid="recs-gated">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sand text-gold-dark"><ShieldCheck size={26} /></span>
          {consent === 'denied' ? (
            <>
              <h2 className="mt-4 text-2xl font-semibold">Personalized recommendations are off</h2>
              <p className="mt-2 max-w-md text-sm text-ink/60">Your preference history has been cleared and isn’t being used. You can still browse the full collection.</p>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-2xl font-semibold">We’ll only personalize with your permission</h2>
              <p className="mt-2 max-w-md text-sm text-ink/60">Allow FitStyle AI to use your wishlist, bag and recent searches to curate dresses for you.</p>
            </>
          )}
          <div className="mt-6 flex gap-3">
            <button onClick={askAgain} className="btn-primary" data-testid="open-consent">Personalize my picks</button>
            <Link to="/shop" className="btn-outline">Browse all</Link>
          </div>
        </section>
      )}
    </div>
  );
}
