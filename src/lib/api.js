async function handle(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON response
  }
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}

const postJson = (url, data) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(handle);

export const api = {
  health: () => fetch('/api/health').then(handle),
  tryOn: (productId, photo) => {
    const form = new FormData();
    form.append('productId', productId);
    form.append('photo', photo);
    return fetch('/api/try-on', { method: 'POST', body: form }).then(handle);
  },
  calculateMatch: (productId, image) => postJson('/api/calculate-match', { productId, image }),
  stylingSuggestions: (productId, image, match) => postJson('/api/styling-suggestions', { productId, image, match }),
  recommendations: (history) => postJson('/api/recommendations', { ...history, consent: true }),
};
