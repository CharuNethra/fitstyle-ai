import { useRef, useState } from 'react';
import { useObjectUrl } from '../lib/useObjectUrl.js';
import { Camera, ImagePlus, Trash2, User } from 'lucide-react';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'];
const MAX = 12 * 1024 * 1024;

export default function PhotoDropzone({ file, onChange, onError }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const preview = useObjectUrl(file);

  const accept = (f) => {
    if (!f) return;
    if (!ACCEPT.includes(f.type)) return onError?.('Please upload a JPG, PNG, WEBP or SVG image.');
    if (f.size > MAX) return onError?.('That photo is larger than 12 MB — please choose a smaller one.');
    onError?.(null);
    onChange(f);
  };

  const useSample = async () => {
    const res = await fetch('/samples/sample-model.svg');
    const blob = await res.blob();
    accept(new File([blob], 'sample-model.svg', { type: 'image/svg+xml' }));
  };

  if (preview) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-sand" data-testid="photo-preview">
        <img src={preview} alt="Your uploaded photo" className="mx-auto max-h-80 w-full object-contain" />
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button onClick={() => inputRef.current?.click()} className="btn-outline px-4 py-2 text-xs"><Camera size={14} />Replace</button>
          <button onClick={() => onChange(null)} className="btn-outline px-4 py-2 text-xs" aria-label="Remove photo"><Trash2 size={14} /></button>
        </div>
        <input ref={inputRef} type="file" accept={ACCEPT.join(',')} hidden onChange={(e) => accept(e.target.files?.[0])} />
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        data-testid="dropzone"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition ${
          drag ? 'border-gold bg-gold/5' : 'border-ink/15 bg-white hover:border-gold/60'
        }`}
      >
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sand text-gold-dark"><ImagePlus size={26} /></span>
        <p className="mt-4 font-medium">Drag & drop your full-body photo</p>
        <p className="mt-1 text-sm text-ink/50">or click to browse · JPG, PNG, WEBP up to 12 MB</p>
        <input ref={inputRef} type="file" accept={ACCEPT.join(',')} hidden data-testid="photo-input" onChange={(e) => accept(e.target.files?.[0])} />
      </div>
      <button onClick={useSample} className="btn-ghost mt-2 w-full text-xs" data-testid="use-sample">
        <User size={14} /> No photo handy? Use our sample model
      </button>
    </div>
  );
}
