import { ShieldCheck } from 'lucide-react';
import { INTIMATES_MESSAGE } from '../../shared/taxonomy.js';

/** Safety & Privacy notice for the Intimates / Innerwear category. `compact` shows only the try-on banner. */
export default function SafetyNotice({ compact = false, className = '' }) {
  return (
    <div role="note" className={`flex gap-3 rounded-2xl border border-gold/30 bg-gold/10 p-4 text-sm text-ink/80 ${className}`} data-testid={compact ? 'intimates-banner' : 'safety-notice'}>
      <ShieldCheck size={20} className="mt-0.5 shrink-0 text-gold-dark" />
      <div>
        {!compact && <p className="font-semibold text-ink">Safety & Privacy Guidelines</p>}
        <p className={compact ? '' : 'mt-1'}>{INTIMATES_MESSAGE}</p>
        {!compact && (
          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-ink/60">
            <li>Products are shown on a mannequin only. Personal photos can't be uploaded for this category.</li>
            <li>No intimate-wear images are generated from customer photos.</li>
            <li>Size guidance is based on measurements, not photos.</li>
          </ul>
        )}
      </div>
    </div>
  );
}
