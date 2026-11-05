import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Heart, LogOut, Menu, Search, ShoppingBag, Sparkles, User, Wallet, X } from 'lucide-react';
import { useStore } from '../context/StoreContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { formatPrice } from '../../shared/products.js';

const NAV = [
  { to: '/shop?audience=Women', label: 'Women' },
  { to: '/shop?audience=Men', label: 'Men' },
  { to: '/shop?audience=Kids', label: 'Kids' },
  { to: '/try-on', label: 'Try-On Studio' },
  { to: '/for-you', label: 'For You' },
];

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="FitStyle AI home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-gold-light">
        <Sparkles size={18} />
      </span>
      <span className="font-serif text-2xl font-semibold tracking-tight">
        FitStyle <span className="text-gold">AI</span>
      </span>
    </Link>
  );
}

export default function Header() {
  const { cartCount, wishlist, recordSearch, notify } = useStore();
  const { user, guest, openAuth, logout } = useAuth();
  const { banners } = useCatalog();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    recordSearch(q);
    navigate(`/shop?q=${encodeURIComponent(q)}`);
    setQuery('');
    setOpen(false);
  };

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition hover:text-gold-dark ${isActive ? 'text-ink' : 'text-ink/60'}`;

  return (
    <header className="sticky top-0 z-40 border-b border-ink/5 bg-cream/90 backdrop-blur">
      <div className="bg-ink py-2 text-center text-xs tracking-wide text-white/80" data-testid="announcement">
        {banners.length ? banners.map((b) => b.text).join(' · ') : 'Complimentary shipping over $150 · Try anything on with AI before you buy'}
      </div>
      <div className="container-luxe flex h-16 items-center gap-6">
        <button className="lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <Logo />
        <nav className="ml-6 hidden items-center gap-7 lg:flex">
          {NAV.map((n) => (
            <NavLink key={n.label} to={n.to} className={linkClass} end>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <form onSubmit={submit} className="ml-auto hidden max-w-xs flex-1 md:block" role="search">
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dresses, colours, styles…"
              className="input rounded-full py-2 pl-9"
              aria-label="Search products"
              data-testid="header-search"
            />
          </label>
        </form>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          {user ? (
            <div className="flex items-center gap-1">
              <span className="hidden items-center gap-1.5 rounded-full bg-sand px-3 py-1.5 text-xs font-medium sm:flex" data-testid="wallet-balance" title="FitStyle Wallet">
                <Wallet size={14} className="text-gold-dark" />{formatPrice(user.wallet ?? 0)}
              </span>
              <span className="hidden max-w-28 truncate px-2 text-sm font-medium md:block" data-testid="user-name">{user.name}</span>
              <button
                onClick={async () => { await logout(); notify('Logged out'); }}
                className="rounded-full p-2 hover:bg-sand"
                aria-label="Log out"
                data-testid="logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button onClick={() => openAuth()} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium hover:bg-sand" data-testid="login-button">
              <User size={18} /><span className="hidden sm:inline">{guest ? 'Guest · Log in' : 'Log in'}</span>
            </button>
          )}
          <Link to="/wishlist" className="relative rounded-full p-2 hover:bg-sand" aria-label="Wishlist">
            <Heart size={20} />
            {wishlist.length > 0 && (
              <span data-testid="wishlist-count" className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-white">
                {wishlist.length}
              </span>
            )}
          </Link>
          <Link to="/cart" className="relative rounded-full p-2 hover:bg-sand" aria-label="Cart">
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span data-testid="cart-count" className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
      {open && (
        <div className="border-t border-ink/5 bg-cream lg:hidden">
          <div className="container-luxe flex flex-col gap-4 py-4">
            <form onSubmit={submit} role="search">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="input rounded-full" aria-label="Search products" />
            </form>
            {NAV.map((n) => (
              <NavLink key={n.label} to={n.to} className={linkClass} onClick={() => setOpen(false)} end>
                {n.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
