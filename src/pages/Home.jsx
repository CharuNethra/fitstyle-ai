import { Link } from 'react-router-dom';
import { ArrowRight, Gem, Lock, ScanLine, Sparkles, WandSparkles } from 'lucide-react';
import { PRODUCTS } from '../../shared/products.js';
import ProductCard from '../components/ProductCard.jsx';
import ProductImage from '../components/ProductImage.jsx';

const FEATURES = [
  { icon: WandSparkles, title: 'Virtual Try-On', text: 'Upload a full-body photo and see any piece fitted to you in seconds.' },
  { icon: ScanLine, title: 'AI Match Score', text: 'A percentage score for your silhouette, tone and the season — with the reasons why.' },
  { icon: Gem, title: 'Complete-Look Stylist', text: 'Hairstyle, accessory and footwear pairings curated for every outfit.' },
  { icon: Lock, title: 'Private by Design', text: 'Personalized picks appear only when you say yes — and “no” clears your history.' },
];

const CATEGORY_TILES = [
  { name: 'Dresses', product: 'aurelia-satin-slip' },
  { name: 'Tops', product: 'ivory-silk-blouse' },
  { name: 'Outerwear', product: 'camel-wool-coat' },
  { name: 'Casual', product: 'riviera-stripe-sundress' },
  { name: 'Formal', product: 'noir-column-gown' },
];

export default function Home() {
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
  return (
    <>
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-gold/20 blur-3xl" />
        <div className="container-luxe relative grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
          <div className="animate-fade-up">
            <p className="eyebrow text-gold-light">The AI fitting room</p>
            <h1 className="mt-4 text-5xl font-semibold leading-[1.05] sm:text-6xl">
              Try it on.<br /><em className="text-gold-light">Before</em> you buy it.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/70">
              FitStyle AI drapes our luxury collection onto your own photo, scores how well it suits you, and styles the complete look — hair, accessories and shoes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/try-on" className="btn-gold"><Sparkles size={16} />Start Virtual Try-On</Link>
              <Link to="/shop" className="btn border border-white/25 text-white hover:bg-white/10">Shop the Collection <ArrowRight size={16} /></Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {['emerald-wrap-midi', 'noir-column-gown', 'camel-wool-coat'].map((id, i) => (
              <div key={id} className={`animate-fade-up ${i === 1 ? 'translate-y-8' : ''}`} style={{ animationDelay: `${i * 120}ms` }}>
                <ProductImage product={byId[id]} className="aspect-[3/5] rounded-[2rem] ring-1 ring-white/10" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-luxe grid gap-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card p-6">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sand text-gold-dark"><Icon size={20} /></span>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/60">{text}</p>
          </div>
        ))}
      </section>

      <section className="container-luxe">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="eyebrow">Shop by category</p>
            <h2 className="mt-2 text-3xl font-semibold">Curated edits</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORY_TILES.map((c) => (
            <Link key={c.name} to={`/shop?category=${c.name}`} className="group relative">
              <ProductImage product={byId[c.product]} className="aspect-square rounded-3xl" />
              <span className="absolute inset-x-3 bottom-3 rounded-full bg-white/95 py-2 text-center text-sm font-semibold shadow-sm transition group-hover:bg-ink group-hover:text-white">
                {c.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-luxe mt-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="eyebrow">Just arrived</p>
            <h2 className="mt-2 text-3xl font-semibold">New season essentials</h2>
          </div>
          <Link to="/shop" className="btn-ghost hidden sm:inline-flex">View all <ArrowRight size={16} /></Link>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {PRODUCTS.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      <section className="container-luxe mt-20">
        <div className="card flex flex-col items-start justify-between gap-6 bg-sand p-10 md:flex-row md:items-center">
          <div>
            <p className="eyebrow">Made for you — with your permission</p>
            <h2 className="mt-2 text-3xl font-semibold">Personalized dress recommendations</h2>
            <p className="mt-2 max-w-xl text-sm text-ink/60">
              We can tailor picks from your wishlist, bag and searches. We always ask first, and you can clear your preferences at any time.
            </p>
          </div>
          <Link to="/for-you" className="btn-primary shrink-0" data-testid="home-for-you">See my picks <ArrowRight size={16} /></Link>
        </div>
      </section>
    </>
  );
}
