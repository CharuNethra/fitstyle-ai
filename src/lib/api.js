async function handle(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    const fallback = body
      ? `Request failed (${res.status})`
      : `The FitStyle API is not reachable (${res.status}). Make sure the backend server is running.`;
    throw new Error(body?.error || fallback);
  }
  return body;
}

const MAX_SIDE = 1600;

// Keeps uploads small (serverless hosts such as Vercel cap request bodies at ~4.5 MB).
async function shrinkPhoto(file) {
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type) || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 3 * 1024 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    return blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

const postJson = (url, data) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(handle);

export const api = {
  health: () => fetch('/api/health').then(handle),
  tryOn: async (productId, photo) => {
    const form = new FormData();
    form.append('productId', productId);
    form.append('photo', await shrinkPhoto(photo));
    return fetch('/api/try-on', { method: 'POST', body: form }).then(handle);
  },
  calculateMatch: (productId, image) => postJson('/api/calculate-match', { productId, image }),
  stylingSuggestions: (productId, image, match) => postJson('/api/styling-suggestions', { productId, image, match }),
  recommendations: (history) => postJson('/api/recommendations', { ...history, consent: true }),
};
