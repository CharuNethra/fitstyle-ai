import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Minus, Plus, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { formatPrice, getProduct } from '../../shared/products.js';
import ProductImage from '../components/ProductImage.jsx';
import CheckoutModal from '../components/CheckoutModal.jsx';
import { useStore } from '../context/StoreContext.jsx';

const FREE_SHIPPING = 150;
const TAX_RATE = 0.08;

export default function Cart() {
  const { cart, setQty, removeFromCart, clearCart, subtotal, toggleWishlist, isWishlisted, notify } = useStore();
  const [checkout, setCheckout] = useState(false);
  const [total, setTotal] = useState(0);

  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING ? 0 : 12;
  const tax = subtotal * TAX_RATE;
  const grand = subtotal + shipping + tax;

  const modal = (
    <CheckoutModal
      open={checkout}
      total={total}
      onClose={() => setCheckout(false)}
      onComplete={() => clearCart()}
    />
  );

  return (
    <>
      {cart.length ? renderBag() : renderEmpty()}
      {modal}
    </>
  );

  function renderEmpty() {
    return (
      <div className="container-luxe py-24 text-center">
        <ShoppingBag size={40} className="mx-auto text-gold" />
        <h1 className="mt-4 text-4xl font-semibold">Your bag is empty</h1>
        <p className="mt-2 text-ink/60">Discover pieces you’ll love — and try them on first.</p>
        <Link to="/shop" className="btn-primary mt-8">Start shopping</Link>
      </div>
    );
  }

  function renderBag() {
      return (
      <div className="container-luxe py-12">
        <h1 className="text-4xl font-semibold">Shopping bag</h1>
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
          <ul className="divide-y divide-ink/10">
            {cart.map((item) => {
              const p = getProduct(item.id);
              return (
                <li key={item.key} className="flex gap-5 py-6" data-testid="cart-item">
                  <Link to={`/product/${p.id}`}><ProductImage product={p} className="h-36 w-28 shrink-0 rounded-2xl" /></Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-4">
                      <div>
                        <Link to={`/product/${p.id}`} className="font-semibold hover:text-gold-dark">{p.name}</Link>
                        <p className="mt-1 text-sm text-ink/60">{p.colorName} · Size {item.size}</p>
                      </div>
                      <p className="font-semibold" data-testid="line-total">{formatPrice(p.price * item.qty)}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <div className="flex items-center rounded-full border border-ink/15 bg-white">
                        <button onClick={() => setQty(item.key, item.qty - 1)} disabled={item.qty <= 1} className="p-2.5 disabled:opacity-30" aria-label="Decrease quantity"><Minus size={14} /></button>
                        <span className="w-8 text-center text-sm font-semibold" data-testid="qty">{item.qty}</span>
                        <button onClick={() => setQty(item.key, item.qty + 1)} disabled={item.qty >= 10} className="p-2.5 disabled:opacity-30" aria-label="Increase quantity"><Plus size={14} /></button>
                      </div>
                      <div className="flex gap-1">
                        {!isWishlisted(p.id) && (
                          <button onClick={() => { toggleWishlist(p.id); removeFromCart(item.key); notify('Moved to wishlist'); }} className="btn-ghost px-3 py-2 text-xs"><Heart size={14} />Save for later</button>
                        )}
                        <button onClick={() => { removeFromCart(item.key); notify('Removed from bag', 'info'); }} className="btn-ghost px-3 py-2 text-xs" aria-label="Remove item"><Trash2 size={14} />Remove</button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <aside className="card h-fit p-6 lg:sticky lg:top-28">
            <h2 className="text-xl font-semibold">Order summary</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-ink/60">Subtotal</dt><dd data-testid="subtotal">{formatPrice(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink/60">Shipping</dt><dd>{shipping ? formatPrice(shipping) : 'Free'}</dd></div>
              <div className="flex justify-between"><dt className="text-ink/60">Estimated tax</dt><dd>{formatPrice(tax)}</dd></div>
              <div className="flex justify-between border-t border-ink/10 pt-3 text-base font-semibold"><dt>Total</dt><dd data-testid="grand-total">{formatPrice(grand)}</dd></div>
            </dl>
            {shipping > 0 && (
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-cream p-3 text-xs text-ink/60"><Truck size={14} />Add {formatPrice(FREE_SHIPPING - subtotal)} more for free shipping</p>
            )}
            <button onClick={() => { setTotal(grand); setCheckout(true); }} className="btn-primary mt-6 w-full py-4" data-testid="checkout">Checkout</button>
            <Link to="/shop" className="btn-ghost mt-2 w-full">Continue shopping</Link>
          </aside>
        </div>
      </div>
    );
  }
}
