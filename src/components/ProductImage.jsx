import { useMemo } from 'react';
import { garmentDataUri } from '../../shared/garments.js';

export default function ProductImage({ product, className = '', eager = false }) {
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
