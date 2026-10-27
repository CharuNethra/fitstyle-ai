import { Link } from 'react-router-dom';
import { Logo } from './Header.jsx';

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-ink/5 bg-white">
      <div className="container-luxe grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink/60">
            Luxury fashion, fitted by AI. See every piece on you, understand why it works, and complete the look — before it ever reaches your door.
          </p>
        </div>
        <div>
          <h4 className="mb-3 font-sans text-sm font-semibold">Shop</h4>
          <ul className="space-y-2 text-sm text-ink/60">
            {['Dresses', 'Tops', 'Outerwear', 'Casual', 'Formal'].map((c) => (
              <li key={c}><Link className="hover:text-ink" to={`/shop?category=${c}`}>{c}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-sans text-sm font-semibold">Experience</h4>
          <ul className="space-y-2 text-sm text-ink/60">
            <li><Link className="hover:text-ink" to="/try-on">Virtual Try-On</Link></li>
            <li><Link className="hover:text-ink" to="/for-you">Personalized Picks</Link></li>
            <li><Link className="hover:text-ink" to="/wishlist">Wishlist</Link></li>
            <li><Link className="hover:text-ink" to="/cart">Shopping Bag</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink/5 py-5 text-center text-xs text-ink/50">
        © {new Date().getFullYear()} FitStyle AI · Demo store — no real payments are processed.
      </div>
    </footer>
  );
}
