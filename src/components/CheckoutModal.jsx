import { useState } from 'react';
import { CircleCheck, CreditCard, LoaderCircle, Lock } from 'lucide-react';
import Modal from './Modal.jsx';
import { formatPrice } from '../../shared/products.js';

const FIELDS = [
  { name: 'name', label: 'Full name', placeholder: 'Ava Laurent', span: 2 },
  { name: 'email', label: 'Email', placeholder: 'ava@example.com', type: 'email', span: 2 },
  { name: 'address', label: 'Shipping address', placeholder: '12 Rue Saint-Honoré', span: 2 },
  { name: 'city', label: 'City', placeholder: 'Paris' },
  { name: 'zip', label: 'Postal code', placeholder: '75001' },
  { name: 'card', label: 'Card number', placeholder: '4242 4242 4242 4242', span: 2, inputMode: 'numeric' },
  { name: 'expiry', label: 'Expiry (MM/YY)', placeholder: '12/28' },
  { name: 'cvc', label: 'CVC', placeholder: '123', inputMode: 'numeric' },
];

function validate(v) {
  const e = {};
  if (!v.name?.trim()) e.name = 'Required';
  if (!/^\S+@\S+\.\S+$/.test(v.email || '')) e.email = 'Enter a valid email';
  if (!v.address?.trim()) e.address = 'Required';
  if (!v.city?.trim()) e.city = 'Required';
  if (!v.zip?.trim()) e.zip = 'Required';
  if ((v.card || '').replace(/\D/g, '').length < 12) e.card = 'Enter a valid card number';
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(v.expiry || '')) e.expiry = 'Use MM/YY';
  if (!/^\d{3,4}$/.test(v.cvc || '')) e.cvc = '3–4 digits';
  return e;
}

export default function CheckoutModal({ open, total, onClose, onComplete }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('form');
  const [orderId, setOrderId] = useState('');

  const close = () => {
    if (status === 'processing') return;
    if (status === 'done') {
      setValues({});
      setStatus('form');
    }
    onClose();
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setStatus('processing');
    setTimeout(() => {
      setOrderId(`FS-${Date.now().toString(36).toUpperCase().slice(-6)}`);
      setStatus('done');
      onComplete();
    }, 1400);
  };

  return (
    <Modal open={open} onClose={close} labelledBy="checkout-title" dismissible={status !== 'processing'} testId="checkout-modal">
      {status === 'done' ? (
        <div className="py-6 text-center" data-testid="order-confirmation">
          <CircleCheck size={56} className="mx-auto text-gold" />
          <h2 id="checkout-title" className="mt-4 text-3xl font-semibold">Thank you!</h2>
          <p className="mt-2 text-ink/60">Your order <strong className="text-ink">{orderId}</strong> has been placed.</p>
          <p className="mt-1 text-sm text-ink/50">A confirmation has been sent to {values.email}. (Demo — no payment taken.)</p>
          <button onClick={close} className="btn-primary mt-8">Continue shopping</button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <h2 id="checkout-title" className="text-2xl font-semibold">Secure checkout</h2>
          <p className="mt-1 flex items-center gap-1 text-xs text-ink/50"><Lock size={12} />Simulated payment — use any test details</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <label key={f.name} className={f.span === 2 ? 'col-span-2' : ''}>
                <span className="mb-1 block text-xs font-medium text-ink/70">{f.label}</span>
                <input
                  name={f.name}
                  type={f.type || 'text'}
                  inputMode={f.inputMode}
                  placeholder={f.placeholder}
                  value={values[f.name] || ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  className={`input py-2.5 ${errors[f.name] ? 'border-red-400' : ''}`}
                  aria-invalid={Boolean(errors[f.name])}
                />
                {errors[f.name] && <span className="mt-1 block text-[11px] text-red-600">{errors[f.name]}</span>}
              </label>
            ))}
          </div>
          <button type="submit" disabled={status === 'processing'} className="btn-primary mt-6 w-full py-4" data-testid="place-order">
            {status === 'processing' ? <LoaderCircle size={18} className="animate-spin" /> : <CreditCard size={18} />}
            {status === 'processing' ? 'Processing payment…' : `Pay ${formatPrice(total)}`}
          </button>
        </form>
      )}
    </Modal>
  );
}
