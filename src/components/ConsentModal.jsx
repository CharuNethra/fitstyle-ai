import { Heart, Search, ShieldCheck, ShoppingBag } from 'lucide-react';
import Modal from './Modal.jsx';
import { useStore } from '../context/StoreContext.jsx';

export default function ConsentModal({ open, onYes, onNo, onClose }) {
  const { interactions } = useStore();
  const rows = [
    { icon: Heart, label: 'Wishlist items', value: interactions.wishlist.length },
    { icon: ShoppingBag, label: 'Cart items', value: interactions.cart.length },
    { icon: Search, label: 'Recent searches', value: interactions.searches.length },
  ];
  return (
    <Modal open={open} onClose={onClose} labelledBy="consent-title" testId="consent-modal">
      <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-sand text-gold-dark">
        <ShieldCheck size={24} />
      </div>
      <p className="eyebrow">Your data, your choice</p>
      <h2 id="consent-title" className="mt-2 text-2xl font-semibold leading-snug">
        Would you like to see personalized dress recommendations based on your recent wishlist, cart, and search history?
      </h2>
      <ul className="mt-5 grid grid-cols-3 gap-3">
        {rows.map(({ icon: Icon, label, value }) => (
          <li key={label} className="rounded-2xl bg-cream p-3 text-center">
            <Icon size={16} className="mx-auto text-gold-dark" />
            <p className="mt-1 text-lg font-semibold">{value}</p>
            <p className="text-[11px] text-ink/60">{label}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-ink/60">
        Your history stays in this browser. Choosing “No” clears the preference signals we collected and we won’t use them for recommendations.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button onClick={onYes} className="btn-primary flex-1" data-testid="consent-yes">YES, Show Recommendations</button>
        <button onClick={onNo} className="btn-outline flex-1" data-testid="consent-no">NO, Clear Preferences</button>
      </div>
    </Modal>
  );
}
