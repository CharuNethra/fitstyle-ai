import { useState } from 'react';
import { Banknote, CircleCheck, CreditCard, LoaderCircle, Lock, Smartphone, Wallet } from 'lucide-react';
import Modal from './Modal.jsx';
import { formatPrice } from '../../shared/products.js';
import { UPI_APPS, checkPincode, priceOrder } from '../../shared/checkout.js';
import { api } from '../lib/api.js';

const ADDRESS = [
  { name: 'name', label: 'Full name', placeholder: 'Ananya Rao', span: 2 },
  { name: 'phone', label: 'Phone', placeholder: '9876543210', inputMode: 'numeric' },
  { name: 'pincode', label: 'Pincode', placeholder: '600001', inputMode: 'numeric' },
  { name: 'line', label: 'Address', placeholder: '12 Anna Salai, T. Nagar', span: 2 },
  { name: 'city', label: 'City', placeholder: 'Chennai', span: 2 },
];
const CARD = [
  { name: 'card', label: 'Card number', placeholder: '4242 4242 4242 4242', span: 2, inputMode: 'numeric' },
  { name: 'expiry', label: 'Expiry (MM/YY)', placeholder: '12/28' },
  { name: 'cvc', label: 'CVC', placeholder: '123', inputMode: 'numeric' },
];
const METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: Banknote },
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'card', label: 'Credit / Debit Card', icon: CreditCard },
];

function Field({ f, values, errors, set }) {
  return (
    <label className={f.span === 2 ? 'col-span-2' : ''}>
      <span className="mb-1 block text-xs font-medium text-ink/70">{f.label}</span>
      <input
        name={f.name}
        inputMode={f.inputMode}
        placeholder={f.placeholder}
        value={values[f.name] || ''}
        onChange={(e) => set(f.name, e.target.value)}
        className={`input py-2.5 ${errors[f.name] ? 'border-red-400' : ''}`}
        aria-invalid={Boolean(errors[f.name])}
      />
      {errors[f.name] && <span className="mt-1 block text-[11px] text-red-600">{errors[f.name]}</span>}
    </label>
  );
}

function validate(v, method, payable) {
  const e = {};
  if (!v.name?.trim()) e.name = 'Required';
  if (!/^\d{10}$/.test((v.phone || '').replace(/\D/g, ''))) e.phone = '10 digits';
  if (!checkPincode(v.pincode).ok) e.pincode = 'Not serviceable / invalid';
  if (!v.line?.trim()) e.line = 'Required';
  if (!v.city?.trim()) e.city = 'Required';
  if (payable > 0 && method === 'upi' && !/^[\w.-]{2,}@[a-z]{2,}$/i.test(v.upiId || '')) e.upiId = 'e.g. name@okaxis';
  if (payable > 0 && method === 'card') {
    if ((v.card || '').replace(/\D/g, '').length < 12) e.card = 'Enter a valid card number';
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(v.expiry || '')) e.expiry = 'Use MM/YY';
    if (!/^\d{3,4}$/.test(v.cvc || '')) e.cvc = '3–4 digits';
  }
  return e;
}

export default function CheckoutModal({ open, items, lines, discount, wallet, initialUseWallet, pincode, user, onClose, onComplete }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [method, setMethod] = useState('cod');
  const [upiApp, setUpiApp] = useState(UPI_APPS[0]);
  const [useWallet, setUseWallet] = useState(initialUseWallet);
  const [status, setStatus] = useState('form');
  const [order, setOrder] = useState(null);
  const [failure, setFailure] = useState('');
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open && status !== 'done') {
      setUseWallet(initialUseWallet);
      setValues((v) => ({ name: user?.name || '', pincode: pincode || '', ...v }));
    }
  }

  const totals = priceOrder({ lines, percent: discount?.percent || 0, wallet, useWallet });
  const set = (k, val) => setValues((v) => ({ ...v, [k]: val }));

  const close = () => {
    if (status === 'processing') return;
    if (status === 'done') {
      setValues({});
      setOrder(null);
      setStatus('form');
    }
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(values, method, totals.payable);
    setErrors(errs);
    setFailure('');
    if (Object.keys(errs).length) return;
    setStatus('processing');
    try {
      const res = await api.placeOrder({
        items: items.map(({ id, size, qty }) => ({ id, size, qty })),
        code: discount?.code,
        useWallet,
        paymentMethod: totals.payable > 0 ? method : 'wallet',
        upiApp,
        upiId: values.upiId,
        card: { number: values.card, expiry: values.expiry, cvc: values.cvc },
        pincode: values.pincode,
        address: { name: values.name, phone: values.phone, line: values.line, city: values.city },
      });
      setOrder(res.order);
      setStatus('done');
      onComplete(res);
    } catch (err) {
      setFailure(err.message);
      setStatus('form');
    }
  };

  const payLabel = totals.payable <= 0
    ? 'Pay with FitStyle Wallet'
    : method === 'cod' ? `Place order · ${formatPrice(totals.payable)} on delivery`
      : method === 'upi' ? `Pay ${formatPrice(totals.payable)} with ${upiApp}` : `Pay ${formatPrice(totals.payable)}`;

  return (
    <Modal open={open} onClose={close} labelledBy="checkout-title" dismissible={status !== 'processing'} testId="checkout-modal">
      {status === 'done' && order ? (
        <div className="py-6 text-center" data-testid="order-confirmation">
          <CircleCheck size={56} className="mx-auto text-gold" />
          <h2 id="checkout-title" className="mt-4 text-3xl font-semibold">Thank you!</h2>
          <p className="mt-2 text-ink/60">Your order <strong className="text-ink" data-testid="order-id">{order.id}</strong> has been placed.</p>
          <p className="mt-1 text-sm text-ink/60">Delivering to {order.pincode} · {order.etaText}</p>
          <p className="mt-1 text-sm text-ink/50" data-testid="order-payment">
            {order.payment.walletApplied > 0 && `${formatPrice(order.payment.walletApplied)} from FitStyle Wallet · `}
            {order.payment.method === 'cod' ? 'Cash on Delivery' : order.payment.method === 'upi' ? `Paid via ${order.payment.app}` : order.payment.method === 'card' ? `Card ending ${order.payment.last4}` : 'Paid in full from wallet'}
          </p>
          <p className="mt-1 text-xs text-ink/40">Demo — no real payment is taken.</p>
          <button onClick={close} className="btn-primary mt-8">Continue shopping</button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="max-h-[80vh] overflow-y-auto pr-1">
          <h2 id="checkout-title" className="text-2xl font-semibold">Secure checkout</h2>
          <p className="mt-1 flex items-center gap-1 text-xs text-ink/50"><Lock size={12} />Simulated payment — use any test details</p>

          <h3 className="mt-6 text-xs font-semibold uppercase tracking-widest text-ink/50">Delivery address</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {ADDRESS.map((f) => <Field key={f.name} f={f} values={values} errors={errors} set={set} />)}
          </div>

          <h3 className="mt-6 text-xs font-semibold uppercase tracking-widest text-ink/50">Payment</h3>
          <label className={`mt-3 flex items-center justify-between gap-3 rounded-2xl border p-3 text-sm ${useWallet ? 'border-gold bg-gold/10' : 'border-ink/10'}`}>
            <span className="flex items-center gap-2"><Wallet size={16} className="text-gold-dark" /><span><strong>FitStyle Wallet</strong> · balance {formatPrice(wallet)}</span></span>
            <input type="checkbox" checked={useWallet} disabled={wallet <= 0} onChange={(e) => setUseWallet(e.target.checked)} data-testid="use-wallet" className="h-4 w-4 accent-[#b8954a]" />
          </label>
          {totals.payable > 0 ? (
            <>
              <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
                {METHODS.map(({ id, label, icon: Icon }) => (
                  <button type="button" key={id} role="radio" aria-checked={method === id} onClick={() => setMethod(id)} data-testid={`pay-${id}`}
                    className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-xs font-semibold ${method === id ? 'border-ink bg-ink text-white' : 'border-ink/10 bg-white text-ink/70'}`}>
                    <Icon size={18} />{label}
                  </button>
                ))}
              </div>
              {method === 'upi' && (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {UPI_APPS.map((a) => (
                      <button type="button" key={a} onClick={() => setUpiApp(a)} aria-pressed={upiApp === a} data-testid={`upi-${a.replace(/\s/g, '')}`}
                        className={`rounded-full px-4 py-1.5 text-xs font-semibold ${upiApp === a ? 'bg-gold text-white' : 'border border-ink/10 text-ink/70'}`}>{a}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3"><Field f={{ name: 'upiId', label: 'UPI ID', placeholder: 'name@okaxis', span: 2 }} values={values} errors={errors} set={set} /></div>
                </div>
              )}
              {method === 'card' && <div className="mt-3 grid grid-cols-2 gap-3">{CARD.map((f) => <Field key={f.name} f={f} values={values} errors={errors} set={set} />)}</div>}
              {method === 'cod' && <p className="mt-3 rounded-xl bg-cream p-3 text-xs text-ink/60">Pay in cash or UPI when your order arrives.</p>}
            </>
          ) : (
            <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800" data-testid="wallet-covers">Your wallet covers this order in full.</p>
          )}

          <dl className="mt-6 space-y-1.5 rounded-2xl bg-cream p-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink/60">Order total</dt><dd>{formatPrice(totals.total)}</dd></div>
            {totals.walletApplied > 0 && <div className="flex justify-between text-emerald-700"><dt>Wallet deduction</dt><dd data-testid="checkout-wallet">−{formatPrice(totals.walletApplied)}</dd></div>}
            <div className="flex justify-between font-semibold"><dt>To pay</dt><dd data-testid="checkout-payable">{formatPrice(totals.payable)}</dd></div>
          </dl>
          {failure && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{failure}</p>}
          <button type="submit" disabled={status === 'processing'} className="btn-primary mt-4 w-full py-4" data-testid="place-order">
            {status === 'processing' ? <LoaderCircle size={18} className="animate-spin" /> : <Lock size={16} />}
            {status === 'processing' ? 'Processing…' : payLabel}
          </button>
        </form>
      )}
    </Modal>
  );
}
