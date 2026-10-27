import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, WandSparkles } from 'lucide-react';
import { formatPrice, getProduct } from '../../shared/products.js';
import ProductImage from '../components/ProductImage.jsx';
import { useStore } from '../context/StoreContext.jsx';

export default function Wishlist() {
  const { wishlist, toggleWishlist, addToCart, notify } = useStore();
  const navigate = useNavigate();
  const items = wishlist.map(getProduct).filter(Boolean);

  if (!items.length) {
    return (
      <div className="container-luxe py-24 text-center">
        <Heart size={40} className="mx-auto text-gold" />
        <h1 className="mt-4 text-4xl font-semibold">Your wishlist is empty</h1>
        <p className="mt-2 text-ink/60">Tap the heart on any piece to save it here.</p>
        <Link to="/shop" className="btn-primary mt-8">Explore the collection</Link>
      </div>
    );
  }

  return (
    <div className="container-luxe py-12">
      <h1 className="text-4xl font-semibold">Wishlist</h1>
      <p className="mt-2 text-ink/60">{items.length} saved {items.length === 1 ? 'piece' : 'pieces'}</p>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <article key={p.id} className="card flex gap-4 p-4" data-testid="wishlist-item">
            <Link to={`/product/${p.id}`}><ProductImage product={p} className="h-40 w-32 shrink-0 rounded-2xl" /></Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <Link to={`/product/${p.id}`} className="font-semibold hover:text-gold-dark">{p.name}</Link>
              <p className="text-sm text-ink/60">{p.colorName}</p>
              <p className="mt-1 font-semibold">{formatPrice(p.price)}</p>
              <div className="mt-auto flex flex-col gap-2 pt-3">
                <button
                  onClick={() => { addToCart(p.id, 'M'); toggleWishlist(p.id); notify(`Moved ${p.name} to your bag`); }}
                  className="btn-primary px-4 py-2 text-xs"
                  data-testid="move-to-cart"
                >
                  <ShoppingBag size={14} />Move to bag
                </button>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/try-on?product=${p.id}`)} className="btn-outline flex-1 px-3 py-2 text-xs"><WandSparkles size={14} />Try on</button>
                  <button onClick={() => { toggleWishlist(p.id); notify('Removed from wishlist', 'info'); }} className="btn-outline px-3 py-2 text-xs" aria-label={`Remove ${p.name} from wishlist`}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
