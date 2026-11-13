import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, Lock, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import Modal from './Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useStore } from '../context/StoreContext.jsx';

export default function AuthModal() {
  const { prompt, closeAuth, login, signup, continueAsGuest } = useAuth();
  const { notify } = useStore();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [sent, setSent] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const switchMode = (m) => {
    setMode(m);
    setError('');
    setSent(null);
  };

  const sendReset = async (e) => {
    e.preventDefault();
    const email = form.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Please enter a valid email address.');
    setBusy(true);
    setError('');
    setSent(null);
    try {
      setSent(await api.forgotPassword(email));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const closeForgot = () => {
    switchMode('login');
    closeAuth();
  };

  if (prompt && mode === 'forgot') {
    return (
      <Modal open onClose={closeForgot} labelledBy="auth-title" testId="auth-modal">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-ink text-gold-light"><KeyRound size={20} /></span>
          <h2 id="auth-title" className="font-serif text-3xl">Reset your password</h2>
          <p className="mt-2 text-sm text-ink/60">Enter the email you signed up with and we'll send you a link to set a new password.</p>
        </div>
        <form onSubmit={sendReset} noValidate className="space-y-3" data-testid="forgot-form">
          <input className="input" type="email" placeholder="Registered email" value={form.email} onChange={set('email')} aria-label="Registered email" data-testid="forgot-email" required />
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" data-testid="forgot-error">{error}</p>}
          {sent && (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status" data-testid="forgot-success">
              {sent.message}
              {sent.previewUrl && (
                <Link to={sent.previewUrl} onClick={closeForgot} className="mt-2 block font-semibold underline" data-testid="reset-preview-link">
                  Open the reset link (demo email preview)
                </Link>
              )}
            </div>
          )}
          <button className="btn-primary w-full py-3" disabled={busy} data-testid="send-reset">
            {busy ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>
        <button type="button" onClick={() => switchMode('login')} className="mt-4 flex w-full items-center justify-center gap-1 text-sm text-ink/60 hover:text-ink" data-testid="back-to-login">
          <ArrowLeft size={14} /> Back to log in
        </button>
      </Modal>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signup') {
        await signup(form.name, form.email, form.password);
        notify('Welcome to FitStyle! $50 wallet bonus added.');
      } else {
        await login(form.email, form.password);
        notify('Welcome back!');
      }
      setForm({ name: '', email: '', password: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!prompt} onClose={closeAuth} labelledBy="auth-title" testId="auth-modal">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-ink text-gold-light">
          {prompt?.reason ? <Lock size={20} /> : <Sparkles size={20} />}
        </span>
        <h2 id="auth-title" className="font-serif text-3xl">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
        <p className="mt-2 text-sm text-ink/60" data-testid="auth-reason">
          {prompt?.reason || 'Log in to shop, try on outfits and use your FitStyle Wallet.'}
        </p>
      </div>
      <div className="mb-5 grid grid-cols-2 rounded-full bg-sand p-1 text-sm font-medium">
        {['login', 'signup'].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`rounded-full py-2 transition ${mode === m ? 'bg-white shadow' : 'text-ink/60'}`}
            data-testid={`auth-tab-${m}`}
          >
            {m === 'login' ? 'Log in' : 'Sign up'}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode === 'signup' && (
          <input className="input" placeholder="Full name" value={form.name} onChange={set('name')} aria-label="Full name" data-testid="auth-name" required />
        )}
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={set('email')} aria-label="Email" data-testid="auth-email" required />
        <input className="input" type="password" placeholder="Password (min 6 characters)" value={form.password} onChange={set('password')} aria-label="Password" data-testid="auth-password" required minLength={6} />
        {mode === 'login' && (
          <div className="text-right">
            <button type="button" onClick={() => switchMode('forgot')} className="text-xs font-medium text-gold-dark underline-offset-4 hover:underline" data-testid="forgot-password">
              Forgot Password?
            </button>
          </div>
        )}
        {error && <p className="text-sm text-red-600" role="alert" data-testid="auth-error">{error}</p>}
        <button className="btn-primary w-full py-3" disabled={busy} data-testid="auth-submit">
          {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
        </button>
      </form>
      <button type="button" onClick={continueAsGuest} className="mt-4 w-full text-center text-sm text-ink/60 underline-offset-4 hover:underline" data-testid="continue-guest">
        Continue as Guest
      </button>
      <p className="mt-2 text-center text-xs text-ink/40">Guests can browse and save to wishlist. Cart, checkout and try-on need an account.</p>
    </Modal>
  );
}
