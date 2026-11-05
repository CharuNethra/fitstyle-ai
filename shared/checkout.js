// Simulated logistics and order pricing shared by the cart UI and the orders API.
export const PIN_RE = /^[1-9]\d{5}$/;
export const FREE_DELIVERY_OVER = 150;
export const DELIVERY_FEE = 12;
export const TAX_RATE = 0.08;
export const PAYMENT_METHODS = ['cod', 'upi', 'card', 'wallet'];
export const UPI_APPS = ['Google Pay', 'PhonePe', 'Paytm'];
const METRO_PREFIXES = ['110', '400', '560', '600', '700', '500', '411', '380'];

const round = (n) => Math.round(n * 100) / 100;

function addBusinessDays(date, n) {
  const d = new Date(date);
  while (n > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) n -= 1;
  }
  return d;
}

const fmt = (d) => d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

export function checkPincode(pin, now = new Date()) {
  const pincode = String(pin ?? '').trim();
  if (!PIN_RE.test(pincode)) return { ok: false, pincode, message: 'Enter a valid 6-digit pincode.' };
  if (pincode.startsWith('9')) return { ok: false, pincode, message: `Sorry, we don't deliver to ${pincode} yet.` };
  const [minDays, maxDays] = METRO_PREFIXES.includes(pincode.slice(0, 3)) ? [2, 3] : pincode[0] <= '4' ? [3, 5] : [4, 6];
  const from = addBusinessDays(now, minDays);
  const to = addBusinessDays(now, maxDays);
  return {
    ok: true,
    pincode,
    minDays,
    maxDays,
    cod: true,
    eta: { from: from.toISOString(), to: to.toISOString() },
    message: `Delivering to ${pincode} in ${minDays}-${maxDays} business days`,
    etaText: `Expected ${fmt(from)} – ${fmt(to)}`,
  };
}

/** lines: [{ price, qty }]. percent: discount-code percentage. */
export function priceOrder({ lines, percent = 0, wallet = 0, useWallet = false }) {
  const subtotal = round(lines.reduce((s, l) => s + l.price * l.qty, 0));
  const discount = round((subtotal * percent) / 100);
  const net = subtotal - discount;
  const delivery = subtotal === 0 || net >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;
  const tax = round(net * TAX_RATE);
  const total = round(net + delivery + tax);
  const walletApplied = useWallet ? round(Math.min(Math.max(0, wallet), total)) : 0;
  return { subtotal, discount, delivery, tax, total, walletApplied, payable: round(total - walletApplied) };
}
