import { useMemo } from 'react';
import { garmentDataUri } from '../../shared/garments.js';
import { isIntimate } from '../../shared/taxonomy.js';

const MANNEQUIN = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><defs><linearGradient id="m" x1="0" x2="1"><stop offset="0" stop-color="#d8cfc2"/><stop offset=".45" stop-color="#f4efe8"/><stop offset="1" stop-color="#cfc4b5"/></linearGradient></defs><rect x="94" y="0" width="12" height="22" fill="#b8954a"/><path d="M84 22 L116 22 L118 40 Q160 46 166 70 L160 120 Q146 150 150 178 Q160 214 146 240 L54 240 Q40 214 50 178 Q54 150 40 120 L34 70 Q40 46 82 40 Z" fill="url(#m)" stroke="#bfb3a3"/><rect x="96" y="240" width="8" height="44" fill="#8a7a63"/><ellipse cx="100" cy="288" rx="44" ry="8" fill="#8a7a63"/></svg>')}`;

export default function ProductImage({ product, className = '', eager = false }) {
  if (isIntimate(product) && !product.image) return <MannequinPreview product={product} className={className} />;
  return <GarmentImage product={product} className={className} eager={eager} />;
}

function MannequinPreview({ product, className }) {
  const garment = useMemo(() => garmentDataUri(product), [product]);
  const top = product.type === 'bra';
  return (
    <div className={`relative overflow-hidden bg-sand ${className}`} data-testid="mannequin-preview">
      <img src={MANNEQUIN} alt="" className="absolute inset-0 h-full w-full object-contain p-4" />
      <img
        src={garment}
        alt={`${product.name} on mannequin`}
        className="absolute left-1/2 -translate-x-1/2 object-contain"
        style={top ? { top: '26%', width: '46%' } : { top: '55%', width: '40%' }}
      />
      <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink/60">Mannequin preview</span>
    </div>
  );
}

function GarmentImage({ product, className, eager }) {
  const illustration = useMemo(
    () => (product.image ? null : garmentDataUri(product, { background: true })),
    [product],
  );
  const photoFit = product.imageFit === 'contain' ? 'object-contain p-2' : 'object-cover object-top';
  return (
    <div
      className={`relative overflow-hidden ${product.image ? '' : 'bg-sand'} ${className}`}
      style={product.image ? { backgroundColor: product.imageBg || '#f4efe8' } : undefined}
    >
      <img
        src={product.image || illustration}
        alt={product.name}
        className={`h-full w-full transition-transform duration-500 group-hover:scale-105 ${product.image ? photoFit : 'object-contain p-4'}`}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
    </div>
  );
}
