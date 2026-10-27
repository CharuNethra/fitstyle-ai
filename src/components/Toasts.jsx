import { CircleCheck, Info } from 'lucide-react';
import { useStore } from '../context/StoreContext.jsx';

export default function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} role="status" className="pointer-events-auto flex animate-fade-up items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-luxe">
          {t.tone === 'info' ? <Info size={16} className="text-gold-light" /> : <CircleCheck size={16} className="text-gold-light" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
