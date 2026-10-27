import { useEffect, useMemo, useRef } from 'react';

/** Returns an object URL for a File/Blob, revoking the previous one when it changes. */
export function useObjectUrl(file) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const prev = useRef(null);
  useEffect(() => {
    if (prev.current && prev.current !== url) URL.revokeObjectURL(prev.current);
    prev.current = url;
  }, [url]);
  return url;
}
