import { Link, useNavigate } from 'react-router-dom';
import { Heart, Star, WandSparkles } from 'lucide-react';
import { formatPrice } from '../../shared/products.js';
import { useStore } from '../context/StoreContext.jsx';
import ProductImage from './ProductImage.jsx';

export default function ProductCard({ product, badge, note }) {
  const { isWishlisted, toggleWishlist, notify } = useStore();
  const navigate = useNavigate();
  const saved = isWishlisted(product.id);

  return (
    <article className="group animate-fade-up" data-testid="product-card" data-product-id={product.id}>
      <div className="relative">
        <Link to={`/product/${product.id}`}>
          <ProductImage product={product} className="aspect-[3/4] rounded-3xl" />
        </Link>
        {badge && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{badge}</span>
        )}
        <button
          onClick={() => {
            toggleWishlist(product.id);
            notify(saved ? 'Removed from wishlist' : 'Saved to wishlist');
          }}
          aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={saved}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-sm transition hover:scale-110"
        >
          <Heart size={16} className={saved ? 'fill-gold text-gold' : 'text-ink/70'} />
        </button>
        <button
          onClick={() => navigate(`/try-on?product=${product.id}`)}
          className="absolute inset-x-3 bottom-3 flex translate-y-2 items-center justify-center gap-2 rounded-full bg-white/95 py-2.5 text-xs font-semibold opacity-0 shadow-sm transition group-hover:translate-y-0 group-hover:opacity-100 focus:translate-y-0 focus:opacity-100"
        >
          <WandSparkles size={14} /> Virtual Try-On
        </button>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3 px-1">
        <div>
          <Link to={`/product/${product.id}`} className="font-medium leading-snug hover:text-gold-dark">{product.name}</Link>
          <p className="mt-0.5 text-xs text-ink/50">{product.colorName} · {product.categories.join(' / ')}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{formatPrice(product.price)}</p>
          <p className="mt-0.5 flex items-center justify-end gap-1 text-xs text-ink/50"><Star size={12} className="fill-gold text-gold" />{product.rating}</p>
        </div>
      </div>
      {note && <p className="mt-2 px-1 text-xs italic leading-relaxed text-gold-dark">{note}</p>}
    </article>
  );
}
