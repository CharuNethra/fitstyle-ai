import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Heart, Layers, Palette, ShoppingBag, Star, Sun, Truck, WandSparkles } from 'lucide-react';
import { formatPrice } from '../../shared/products.js';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import ProductImage from '../components/ProductImage.jsx';
import SafetyNotice from '../components/SafetyNotice.jsx';
import DeliveryChecker from '../components/DeliveryChecker.jsx';
import { isIntimate } from '../../shared/taxonomy.js';
import { pairingsFor } from '../../shared/pairing.js';
import ProductCard from '../components/ProductCard.jsx';
import { useStore } from '../context/StoreContext.jsx';
import NotFound from './NotFound.jsx';

export default function ProductDetail() {
  const { products: PRODUCTS, getProduct } = useCatalog();
  const { id } = useParams();
  const product = getProduct(id);
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isWishlisted, notify } = useStore();
  const { requireAuth } = useAuth();
  const [size, setSize] = useState('M');

  if (!product) return <NotFound />;
  const saved = isWishlisted(product.id);
  const pairs = pairingsFor(product, PRODUCTS);
  const tryWithLook = (rec) => {
    const dress = [product, rec].find((x) => x.category === 'Dresses') || pairs.find((g) => g.category === 'Dresses')?.items[0]?.product;
    if (!dress) return;
    const add = [product, rec].filter((x) => x.id !== dress.id).map((x) => x.id).join(',');
    requireAuth(() => navigate(`/try-on?product=${dress.id}${add ? `&add=${add}` : ''}`), 'Log in or sign up to use the Virtual Try-On.');
  };
  const similar = PRODUCTS.filter((p) => p.id !== product.id && (p.style === product.style || p.type === product.type)).slice(0, 4);

  return (
    <div className="container-luxe py-10">
      <Link to="/shop" className="inline-flex items-center gap-1 text-sm text-ink/60 hover:text-ink"><ChevronLeft size={16} />Back to shop</Link>
      <div className="mt-6 grid gap-12 lg:grid-cols-2">
        <div className="space-y-4">
          <ProductImage product={product} className="aspect-[4/5] rounded-[2rem]" eager />
          {isIntimate(product) && <SafetyNotice />}
        </div>
        <div className="lg:py-6">
          <div className="flex flex-wrap gap-2">
            {product.categories.map((c) => <Link key={c} to={`/shop?category=${c}`} className="chip hover:border-ink/40">{c}</Link>)}
          </div>
          <h1 className="mt-4 text-4xl font-semibold leading-tight" data-testid="product-title">{product.name}</h1>
          <div className="mt-3 flex items-center gap-3 text-sm text-ink/60">
            <span className="flex items-center gap-1"><Star size={14} className="fill-gold text-gold" />{product.rating}</span>
            <span>·</span>
            <span>{product.reviews} reviews</span>
          </div>
          <p className="mt-6 text-3xl font-semibold">{formatPrice(product.price)}</p>
          <p className="mt-6 leading-relaxed text-ink/70">{product.description}</p>

          <div className="mt-8">
            <p className="text-sm font-semibold">Colour: <span className="font-normal text-ink/60">{product.colorName}</span></p>
            <span className="mt-3 block h-9 w-9 rounded-full ring-2 ring-gold ring-offset-2" style={{ background: product.color }} />
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold">Size</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button key={s} onClick={() => setSize(s)} aria-pressed={s === size} className={`h-11 w-14 rounded-xl border text-sm font-medium transition ${s === size ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white hover:border-ink/50'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
{isIntimate(product) ? null : (
            <button onClick={() => requireAuth(() => navigate(`/try-on?product=${product.id}`), 'Log in or sign up to use the Virtual Try-On.')} className="btn-gold flex-1" data-testid="try-on-now">
              <WandSparkles size={16} />Try On Now
            </button>
            )}
            <button
              onClick={() => requireAuth(() => {
                addToCart(product.id, size);
                notify(`Added ${product.name} (${size}) to your bag`);
              }, 'Log in or sign up to add items to your bag.')}
              className="btn-primary flex-1"
              data-testid="add-to-cart"
            >
              <ShoppingBag size={16} />Add to Cart
            </button>
            <button
              onClick={() => {
                toggleWishlist(product.id);
                notify(saved ? 'Removed from wishlist' : 'Saved to wishlist');
              }}
              className="btn-outline"
              aria-pressed={saved}
              data-testid="add-to-wishlist"
            >
              <Heart size={16} className={saved ? 'fill-gold text-gold' : ''} />
              {saved ? 'Wishlisted' : 'Add to Wishlist'}
            </button>
          </div>

          <dl className="mt-10 grid grid-cols-1 gap-4 border-t border-ink/10 pt-8 text-sm sm:grid-cols-3">
            <div className="flex gap-3"><Layers size={18} className="text-gold-dark" /><div><dt className="font-semibold">Fabric</dt><dd className="text-ink/60">{product.fabric}</dd></div></div>
            <div className="flex gap-3"><Sun size={18} className="text-gold-dark" /><div><dt className="font-semibold">Seasons</dt><dd className="capitalize text-ink/60">{product.seasons.join(', ')}</dd></div></div>
            <div className="flex gap-3"><Palette size={18} className="text-gold-dark" /><div><dt className="font-semibold">Palette</dt><dd className="capitalize text-ink/60">{product.palette} · {product.style}</dd></div></div>
          </dl>
          <DeliveryChecker className="mt-6" />
          <p className="mt-3 flex items-center gap-2 text-xs text-ink/50"><Truck size={14} />Free delivery over $150 · Free 30-day returns</p>
        </div>
      </div>

      {pairs.some((g) => g.items.length) && (
        <section className="mt-20" data-testid="complete-the-look">
          <p className="eyebrow">Complete the look</p>
          <h2 className="mt-2 text-2xl font-semibold">Pairs well with {product.name}</h2>
          {pairs.map((g) => g.items.length > 0 && (
            <div key={g.category} className="mt-8" data-testid={`pair-${g.category}`}>
              <h3 className="font-sans text-sm font-semibold uppercase tracking-widest text-ink/50">{g.category}</h3>
              <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
                {g.items.map(({ product: p, reason }) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    note={reason}
                    action={(
                      <button onClick={() => tryWithLook(p)} className="flex w-full items-center justify-center gap-1.5 rounded-full border border-ink/15 bg-white px-3 py-2 text-xs font-semibold transition hover:border-ink" data-testid="try-with-look">
                        <WandSparkles size={14} /> Try-On with Current Look
                      </button>
                    )}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {similar.length > 0 && (
        <section className="mt-20">
          <h2 className="text-2xl font-semibold">You may also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {similar.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
