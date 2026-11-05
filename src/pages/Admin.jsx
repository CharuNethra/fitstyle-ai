import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgePercent, LayoutDashboard, LogOut, Megaphone, Package, Pencil, Plus, ShieldCheck, Tag, Trash2 } from 'lucide-react';
import { api, ADMIN_TOKEN_KEY } from '../lib/api.js';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { Logo } from '../components/Header.jsx';
import { formatPrice } from '../../shared/products.js';
import { AUDIENCES, PRODUCT_CATEGORIES, SUBCATEGORIES } from '../../shared/taxonomy.js';

export function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api.admin.login(form);
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-luxe" data-testid="admin-login">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gold text-white"><ShieldCheck size={22} /></span>
          <h1 className="font-serif text-3xl">Admin Portal</h1>
          <p className="mt-1 text-sm text-ink/60">FitStyle AI staff sign-in</p>
        </div>
        <div className="space-y-3">
          <input className="input" type="email" placeholder="Admin email" aria-label="Admin email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="admin-email" required />
          <input className="input" type="password" placeholder="Password" aria-label="Admin password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="admin-password" required />
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <button className="btn-gold w-full py-3" disabled={busy} data-testid="admin-submit">{busy ? 'Signing in…' : 'Sign in'}</button>
        </div>
        <Link to="/" className="mt-5 block text-center text-xs text-ink/50 hover:text-ink">← Back to store</Link>
      </form>
    </div>
  );
}

const Stat = ({ label, value, testId }) => (
  <div className="card p-5">
    <p className="text-xs uppercase tracking-widest text-ink/50">{label}</p>
    <p className="mt-2 font-serif text-3xl" data-testid={testId}>{value}</p>
  </div>
);

const EMPTY_PRODUCT = { name: '', audience: 'Women', category: 'Dresses', subCategory: 'Casual', price: '', image: '', tryOnImage: '', stock: 10 };

function ProductForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const subs = SUBCATEGORIES[f.category] || [];
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await onSave({ ...f, price: Number(f.price), stock: Number(f.stock) });
    } catch (err) {
      setError(err.message);
    }
  };
  const field = 'flex flex-col gap-1 text-xs font-medium text-ink/60';
  return (
    <form onSubmit={submit} className="card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4" data-testid="product-form">
      <label className={`${field} sm:col-span-2`}>Title<input className="input" value={f.name} onChange={set('name')} required data-testid="pf-name" /></label>
      <label className={field}>Audience<select className="input" value={f.audience} onChange={set('audience')} data-testid="pf-audience">{AUDIENCES.map((a) => <option key={a}>{a}</option>)}</select></label>
      <label className={field}>Category
        <select className="input" value={f.category} onChange={(e) => setF((x) => ({ ...x, category: e.target.value, subCategory: SUBCATEGORIES[e.target.value][0] }))} data-testid="pf-category">
          {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label className={field}>Sub-category<select className="input" value={f.subCategory} onChange={set('subCategory')} data-testid="pf-sub">{subs.map((s) => <option key={s}>{s}</option>)}</select></label>
      <label className={field}>Price (USD)<input className="input" type="number" min="1" step="0.01" value={f.price} onChange={set('price')} required data-testid="pf-price" /></label>
      <label className={field}>Stock<input className="input" type="number" min="0" value={f.stock} onChange={set('stock')} data-testid="pf-stock" /></label>
      <span className="hidden lg:block" />
      <label className={`${field} sm:col-span-2`}>Image URL<input className="input" placeholder="https://… or /images/…" value={f.image} onChange={set('image')} data-testid="pf-image" /></label>
      <label className={`${field} sm:col-span-2`}>Flat-lay overlay image URL (try-on)<input className="input" placeholder="https://… or /images/…" value={f.tryOnImage} onChange={set('tryOnImage')} data-testid="pf-flatlay" /></label>
      {error && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-4" role="alert">{error}</p>}
      <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
        <button className="btn-primary px-6 py-2.5" data-testid="pf-save">Save product</button>
        <button type="button" className="btn-outline px-6 py-2.5" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function Products({ products, reload, notify }) {
  const [editing, setEditing] = useState(null); // null | 'new' | product
  const save = async (data) => {
    if (editing === 'new') await api.admin.createProduct(data);
    else await api.admin.updateProduct(editing.id, data);
    notify(editing === 'new' ? `Added ${data.name}` : `Updated ${data.name}`);
    setEditing(null);
    reload();
  };
  const remove = async (p) => {
    if (!window.confirm(`Remove ${p.name} from the store?`)) return;
    await api.admin.deleteProduct(p.id);
    notify(`Removed ${p.name}`);
    reload();
  };
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl">Product management</h2>
        <button className="btn-gold px-4 py-2 text-sm" onClick={() => setEditing('new')} data-testid="add-product"><Plus size={16} />Add product</button>
      </div>
      {editing && (
        <ProductForm
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? EMPTY_PRODUCT : { ...EMPTY_PRODUCT, ...editing, image: editing.image || '', tryOnImage: editing.tryOnImage || '', stock: editing.stock ?? 0 }}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm" data-testid="product-table">
          <thead className="border-b border-ink/5 text-xs uppercase tracking-wider text-ink/50">
            <tr><th className="p-3">Title</th><th className="p-3">Audience</th><th className="p-3">Category</th><th className="p-3">Sub-category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-ink/5 last:border-0" data-testid={`row-${p.id}`}>
                <td className="p-3 font-medium">{p.name}{p.saleTag && <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold-dark">{p.saleTag}</span>}</td>
                <td className="p-3">{p.audience || '—'}</td>
                <td className="p-3">{p.category || p.categories?.[0]}</td>
                <td className="p-3">{p.subCategory || '—'}</td>
                <td className="p-3">{formatPrice(p.price)}</td>
                <td className="p-3">{p.stock ?? '—'}</td>
                <td className="whitespace-nowrap p-3 text-right">
                  <button className="rounded-full p-2 hover:bg-sand" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}><Pencil size={15} /></button>
                  <button className="rounded-full p-2 text-red-600 hover:bg-red-50" aria-label={`Delete ${p.name}`} onClick={() => remove(p)}><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Offers({ products, offers, reload, notify }) {
  const [code, setCode] = useState({ code: '', percent: 10 });
  const [banner, setBanner] = useState('');
  const [tag, setTag] = useState({ id: '', label: 'SALE' });
  const [error, setError] = useState('');
  const run = (fn, msg) => async (e) => {
    e?.preventDefault();
    setError('');
    try {
      await fn();
      notify(msg);
      reload();
    } catch (err) {
      setError(err.message);
    }
  };
  const tagged = Object.entries(offers.saleTags || {});
  return (
    <section className="space-y-4">
      <h2 className="font-serif text-2xl">Promotions & offers</h2>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card space-y-3 p-5">
          <h3 className="flex items-center gap-2 font-semibold"><BadgePercent size={16} />Discount codes</h3>
          <form onSubmit={run(async () => { await api.admin.createCode(code); setCode({ code: '', percent: 10 }); }, 'Discount code created')} className="flex gap-2">
            <input className="input flex-1 uppercase" placeholder="CODE" value={code.code} onChange={(e) => setCode({ ...code, code: e.target.value })} aria-label="Discount code" data-testid="code-input" required />
            <input className="input w-20" type="number" min="1" max="90" value={code.percent} onChange={(e) => setCode({ ...code, percent: e.target.value })} aria-label="Percent off" data-testid="code-percent" />
            <button className="btn-primary px-3" aria-label="Add code" data-testid="code-add"><Plus size={16} /></button>
          </form>
          <ul className="space-y-2 text-sm" data-testid="code-list">
            {offers.codes?.map((c) => (
              <li key={c.code} className="flex items-center justify-between rounded-xl bg-sand/60 px-3 py-2">
                <span><b>{c.code}</b> · {c.percent}% off</span>
                <button className="text-red-600" aria-label={`Delete ${c.code}`} onClick={run(() => api.admin.deleteCode(c.code), 'Code removed')}><Trash2 size={14} /></button>
              </li>
            ))}
            {!offers.codes?.length && <li className="text-ink/40">No codes yet</li>}
          </ul>
        </div>
        <div className="card space-y-3 p-5">
          <h3 className="flex items-center gap-2 font-semibold"><Megaphone size={16} />Banner announcements</h3>
          <form onSubmit={run(async () => { await api.admin.createBanner(banner); setBanner(''); }, 'Banner posted')} className="flex gap-2">
            <input className="input flex-1" placeholder="e.g. Festive sale — 20% off with FEST20" value={banner} onChange={(e) => setBanner(e.target.value)} aria-label="Banner text" data-testid="banner-input" required maxLength={140} />
            <button className="btn-primary px-3" aria-label="Post banner" data-testid="banner-add"><Plus size={16} /></button>
          </form>
          <ul className="space-y-2 text-sm">
            {offers.banners?.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 rounded-xl bg-sand/60 px-3 py-2">
                <span>{b.text}</span>
                <button className="text-red-600" aria-label="Delete banner" onClick={run(() => api.admin.deleteBanner(b.id), 'Banner removed')}><Trash2 size={14} /></button>
              </li>
            ))}
            {!offers.banners?.length && <li className="text-ink/40">No banners yet</li>}
          </ul>
        </div>
        <div className="card space-y-3 p-5">
          <h3 className="flex items-center gap-2 font-semibold"><Tag size={16} />Sale tags</h3>
          <form onSubmit={run(() => api.admin.setSaleTag(tag.id, tag.label), 'Sale tag saved')} className="flex flex-col gap-2 sm:flex-row">
            <select className="input flex-1" value={tag.id} onChange={(e) => setTag({ ...tag, id: e.target.value })} aria-label="Product" data-testid="tag-product" required>
              <option value="">Choose product…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input className="input sm:w-24" value={tag.label} onChange={(e) => setTag({ ...tag, label: e.target.value })} aria-label="Tag label" maxLength={24} data-testid="tag-label" />
            <button className="btn-primary px-3" aria-label="Save tag" data-testid="tag-add"><Plus size={16} /></button>
          </form>
          <ul className="space-y-2 text-sm">
            {tagged.map(([id, label]) => (
              <li key={id} className="flex items-center justify-between gap-2 rounded-xl bg-sand/60 px-3 py-2">
                <span>{products.find((p) => p.id === id)?.name || id} · <b>{label}</b></span>
                <button className="text-red-600" aria-label="Remove tag" onClick={run(() => api.admin.setSaleTag(id, ''), 'Sale tag removed')}><Trash2 size={14} /></button>
              </li>
            ))}
            {!tagged.length && <li className="text-ink/40">No sale tags yet</li>}
          </ul>
        </div>
      </div>
    </section>
  );
}

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'offers', label: 'Offers', icon: BadgePercent },
];

export default function Admin() {
  const { products, refresh } = useCatalog();
  const { notify } = useStore();
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const denied = useRef(false);
  const deny = useCallback(() => {
    if (denied.current) return;
    denied.current = true;
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    notify('Access Denied: this area is for FitStyle staff only.');
    navigate('/', { replace: true });
  }, [navigate, notify]);
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [offers, setOffers] = useState({ codes: [], banners: [], saleTags: {} });

  const load = useCallback(async () => {
    try {
      const [s, o] = await Promise.all([api.admin.stats(), api.admin.offers()]);
      setStats(s);
      setOffers(o);
    } catch {
      deny();
    }
  }, [deny]);

  const reload = useCallback(() => {
    load();
    refresh();
  }, [load, refresh]);

  useEffect(() => {
    if (!localStorage.getItem(ADMIN_TOKEN_KEY)) {
      deny();
      return;
    }
    Promise.all([api.admin.stats(), api.admin.offers()])
      .then(([s, o]) => {
        setStats(s);
        setOffers(o);
        setAuthed(true);
      })
      .catch(deny);
  }, [deny]);

  if (!authed) return <div className="grid min-h-screen place-items-center bg-cream text-sm text-ink/50" data-testid="admin-checking">Checking access…</div>;

  const logout = async () => {
    try {
      await api.admin.logout();
    } catch {
      // token already invalid
    }
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-ink/5 bg-white">
        <div className="container-luxe flex h-16 items-center gap-4">
          <Logo />
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gold-light">Admin</span>
          <Link to="/" className="ml-auto hidden text-sm text-ink/60 hover:text-ink sm:block">View store</Link>
          <button onClick={logout} className="btn-outline px-4 py-2 text-sm" data-testid="admin-logout"><LogOut size={15} />Sign out</button>
        </div>
        <nav className="container-luxe flex gap-1 overflow-x-auto pb-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${tab === id ? 'bg-ink text-white' : 'text-ink/60 hover:bg-sand'}`} data-testid={`admin-tab-${id}`}>
              <Icon size={15} />{label}
            </button>
          ))}
        </nav>
      </header>
      <main className="container-luxe space-y-8 py-8">
        {tab === 'dashboard' && (
          <section className="space-y-4" data-testid="admin-dashboard">
            <h2 className="font-serif text-2xl">Overview</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat label="Total products" value={stats?.totalProducts ?? products.length} testId="stat-products" />
              <Stat label="Active users" value={stats?.activeUsers ?? '—'} testId="stat-users" />
              <Stat label="Posted offers" value={stats?.postedOffers ?? '—'} testId="stat-offers" />
              <Stat label="Orders · revenue" value={stats ? `${stats.orders} · ${formatPrice(stats.revenue)}` : '—'} testId="stat-orders" />
            </div>
            <p className="text-sm text-ink/50">{stats?.registeredUsers ?? 0} registered customer accounts.</p>
          </section>
        )}
        {tab === 'products' && <Products products={products} reload={reload} notify={notify} />}
        {tab === 'offers' && <Offers products={products} offers={offers} reload={reload} notify={notify} />}
      </main>
    </div>
  );
}
