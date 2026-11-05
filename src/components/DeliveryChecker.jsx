import { useState } from 'react';
import { MapPin, Truck } from 'lucide-react';
import { checkPincode } from '../../shared/checkout.js';

const KEY = 'fitstyle:pincode';

export const savedDelivery = () => {
  const pin = localStorage.getItem(KEY);
  return pin ? checkPincode(pin) : null;
};

export default function DeliveryChecker({ className = '', onChange }) {
  const [pin, setPin] = useState(() => localStorage.getItem(KEY) || '');
  const [result, setResult] = useState(savedDelivery);

  const check = (e) => {
    e.preventDefault();
    const r = checkPincode(pin);
    setResult(r);
    if (r.ok) localStorage.setItem(KEY, r.pincode);
    onChange?.(r);
  };

  return (
    <div className={`rounded-2xl border border-ink/10 bg-white p-4 ${className}`} data-testid="delivery-checker">
      <p className="flex items-center gap-2 text-sm font-semibold"><Truck size={16} className="text-gold-dark" />Check Delivery Availability</p>
      <form onSubmit={check} className="mt-3 flex gap-2">
        <label className="relative min-w-0 flex-1">
          <MapPin size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="Enter 6-digit pincode"
            aria-label="Pincode"
            className="input py-2 pl-8"
            data-testid="pincode-input"
          />
        </label>
        <button type="submit" className="btn-primary px-5 py-2 text-sm" data-testid="pincode-check">Check</button>
      </form>
      {result && (
        <div className={`mt-3 text-sm ${result.ok ? 'text-emerald-700' : 'text-red-600'}`} data-testid="delivery-result" role="status">
          <p className="font-medium">{result.message}</p>
          {result.ok && <p className="text-xs text-ink/50">{result.etaText} · Cash on Delivery available</p>}
        </div>
      )}
    </div>
  );
}
