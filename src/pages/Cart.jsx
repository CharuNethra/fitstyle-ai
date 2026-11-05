import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Minus, Plus, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { formatPrice } from '../../shared/products.js';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import ProductImage from '../components/ProductImage.jsx';
import CheckoutModal from '../components/CheckoutModal.jsx';
import DeliveryChecker from '../components/DeliveryChecker.jsx';
import { FREE_DELIVERY_OVER, priceOrder } from '../../shared/checkout.js';
import { api } from '../lib/api.js';
import { useStore } from '../context/StoreContext.jsx';


export default function Cart() {
  const { products: PRODUCTS, getProduct } = useCatalog();
  const { cart, setQty, removeFromCart, clearCart, subtotal, toggleWishlist, isWishlisted, notify } = useStore();
  const { requireAuth, user, setWallet } = useAuth();
  const [checkout, setCheckout] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [discount, setDiscount] = useState(null);
  const [codeError, setCodeError] = useState('');
  const [useWallet, setUseWallet] = useState(true);
  const wallet = user?.wallet ?? 0;
  const lines = cart.map((i) => ({ price: getProduct(i.id)?.price ?? 0, qty: i.qty }));
  const totals = priceOrder({ lines, percent: discount?.percent || 0, wallet, useWallet: Boolean(user) && useWallet });
  const applyCode = async (e) => {
    e.preventDefault();
    setCodeError('');
    try {
      setDiscount(await api.validateCode(codeInput));
    } catch (err) {
      setDiscount(null);
      setCodeError(err.message);
    }
  };


  const modal = (
    <CheckoutModal
      open={checkout}
      items={cart}
      lines={lines}
      discount={discount}
      wallet={wallet}
      initialUseWallet={useWallet && wallet > 0}
      pincode={localStorage.getItem('fitstyle:pincode') || ''}
      user={user}
      onClose={() => setCheckout(false)}
      onComplete={(res) => {
        setWallet(res.user.wallet);
        setDiscount(null);
        clearCart();
      }}
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
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex justify-between gap-4">
                      <div>
                        <Link to={`/product/${p.id}`} className="font-semibold hover:text-gold-dark">{p.name}</Link>
                        <p className="mt-1 text-sm text-ink/60">{p.colorName} · Size {item.size}</p>
                      </div>
                      <p className="font-semibold" data-testid="line-total">{formatPrice(p.price * item.qty)}</p>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
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
              {totals.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount ({discount.code} · {discount.percent}%)</dt><dd data-testid="discount">−{formatPrice(totals.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-ink/60">Delivery</dt><dd data-testid="delivery-fee">{totals.delivery ? formatPrice(totals.delivery) : 'Free'}</dd></div>
              <div className="flex justify-between"><dt className="text-ink/60">Estimated tax</dt><dd>{formatPrice(totals.tax)}</dd></div>
              <div className="flex justify-between border-t border-ink/10 pt-3 text-base font-semibold"><dt>Total</dt><dd data-testid="grand-total">{formatPrice(totals.total)}</dd></div>
              {totals.walletApplied > 0 && <div className="flex justify-between text-emerald-700"><dt>FitStyle Wallet</dt><dd data-testid="wallet-applied">−{formatPrice(totals.walletApplied)}</dd></div>}
              {totals.walletApplied > 0 && <div className="flex justify-between font-semibold"><dt>To pay</dt><dd data-testid="payable">{formatPrice(totals.payable)}</dd></div>}
            </dl>
            {totals.delivery > 0 && (
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-cream p-3 text-xs text-ink/60"><Truck size={14} />Add {formatPrice(FREE_DELIVERY_OVER - subtotal + totals.discount)} more for free delivery</p>
            )}
            <form onSubmit={applyCode} className="mt-4 flex gap-2">
              <input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} placeholder="Discount code" aria-label="Discount code" className="input min-w-0 flex-1 py-2" data-testid="code-input" />
              <button className="btn-ghost px-4 py-2 text-sm" data-testid="apply-code">Apply</button>
            </form>
            {codeError && <p className="mt-1 text-xs text-red-600" data-testid="code-error">{codeError}</p>}
            {user && (
              <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-ink/10 p-3 text-sm">
                <span>Use FitStyle Wallet <span className="text-ink/50">({formatPrice(wallet)})</span></span>
                <input type="checkbox" checked={useWallet} disabled={wallet <= 0} onChange={(e) => setUseWallet(e.target.checked)} data-testid="cart-use-wallet" className="h-4 w-4 accent-[#b8954a]" />
              </label>
            )}
            <DeliveryChecker className="mt-4" />
            <button onClick={() => requireAuth(() => setCheckout(true), 'Log in or sign up to check out.')} className="btn-primary mt-6 w-full py-4" data-testid="checkout">Checkout</button>
            <Link to="/shop" className="btn-ghost mt-2 w-full">Continue shopping</Link>
          </aside>
        </div>
      </div>
    );
  }
}
