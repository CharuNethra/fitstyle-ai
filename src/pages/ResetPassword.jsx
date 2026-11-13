import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useStore } from '../context/StoreContext.jsx';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const { openAuth } = useAuth();
  const { notify } = useStore();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    if (form.password !== form.confirm) return setError('The two passwords do not match.');
    setBusy(true);
    setError('');
    try {
      await api.resetPassword(token, form.password);
      notify('Password updated. Please log in with your new password.');
      navigate('/', { replace: true });
      openAuth('Your password has been updated. Log in with your new password.');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="container-luxe flex justify-center py-20">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm" data-testid="reset-page">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-ink text-gold-light"><KeyRound size={20} /></span>
        <h1 className="text-center font-serif text-3xl">Set a new password</h1>
        {!token ? (
          <div className="mt-6 text-center">
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" data-testid="reset-error">
              This reset link is missing its token. Please request a new link from the login window.
            </p>
            <Link to="/" className="btn-primary mt-6">Back to the store</Link>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-6 space-y-3">
            <input className="input" type="password" placeholder="New password (min 6 characters)" autoComplete="new-password" value={form.password} onChange={set('password')} aria-label="New password" data-testid="reset-password" />
            <input className="input" type="password" placeholder="Confirm new password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} aria-label="Confirm new password" data-testid="reset-confirm" />
            {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" data-testid="reset-error">{error}</p>}
            <button className="btn-primary w-full py-3" disabled={busy} data-testid="reset-submit">{busy ? 'Saving…' : 'Update password'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
