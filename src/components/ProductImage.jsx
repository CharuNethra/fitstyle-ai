import { useMemo } from 'react';
import { garmentDataUri } from '../../shared/garments.js';

export default function ProductImage({ product, className = '' }) {
  const src = useMemo(() => garmentDataUri(product, { background: true }), [product]);
  return (
    <div className={`relative overflow-hidden bg-sand ${className}`}>
      <img src={src} alt={product.name} className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105" loading="lazy" />
    </div>
  );
}
