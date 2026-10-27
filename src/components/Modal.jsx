import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, children, labelledBy, dismissible = true, testId }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && dismissible && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => dismissible && onClose?.()} />
      <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} data-testid={testId} className="relative w-full max-w-lg animate-fade-up rounded-3xl bg-white p-8 shadow-luxe">
        {dismissible && (
          <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full p-2 text-ink/50 hover:bg-sand hover:text-ink">
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
