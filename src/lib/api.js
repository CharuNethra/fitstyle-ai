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

export const TOKEN_KEY = 'fitstyle:token';
export const ADMIN_TOKEN_KEY = 'fitstyle:admin-token';

const authHeader = (admin) => {
  const token = localStorage.getItem(admin ? ADMIN_TOKEN_KEY : TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const send = (method, url, data, admin = false) =>
  fetch(url, {
    method,
    headers: { ...authHeader(admin), ...(data !== undefined && { 'Content-Type': 'application/json' }) },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  }).then(handle);

const postJson = (url, data) => send('POST', url, data);
const admin = {
  get: (url) => send('GET', url, undefined, true),
  post: (url, data) => send('POST', url, data, true),
  put: (url, data) => send('PUT', url, data, true),
  del: (url) => send('DELETE', url, undefined, true),
};

export const api = {
  health: () => fetch('/api/health').then(handle),
  tryOn: async (productId, photo) => {
    const form = new FormData();
    form.append('productId', productId);
    form.append('photo', await shrinkPhoto(photo));
    return fetch('/api/try-on', { method: 'POST', headers: authHeader(), body: form }).then(handle);
  },
  layerTryOn: (productId, image) =>
    fetch('/api/try-on/layer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ productId, image }),
    }).then(handle),
  products: () => send('GET', '/api/products'),
  offers: () => send('GET', '/api/offers'),
  validateCode: (code) => postJson('/api/offers/validate', { code }),
  signup: (data) => postJson('/api/auth/signup', data),
  login: (data) => postJson('/api/auth/login', data),
  logout: () => postJson('/api/auth/logout', {}),
  me: () => send('GET', '/api/auth/me'),
  delivery: (pincode) => send('GET', `/api/delivery/${encodeURIComponent(pincode)}`),
  quote: (data) => postJson('/api/orders/quote', data),
  placeOrder: (data) => postJson('/api/orders', data),
  orders: () => send('GET', '/api/orders'),
  admin: {
    login: (data) => postJson('/api/admin/login', data),
    logout: () => admin.post('/api/auth/logout', {}),
    me: () => admin.get('/api/auth/me'),
    stats: () => admin.get('/api/admin/stats'),
    createProduct: (data) => admin.post('/api/admin/products', data),
    updateProduct: (id, data) => admin.put(`/api/admin/products/${encodeURIComponent(id)}`, data),
    deleteProduct: (id) => admin.del(`/api/admin/products/${encodeURIComponent(id)}`),
    offers: () => admin.get('/api/admin/offers'),
    createCode: (data) => admin.post('/api/admin/offers/codes', data),
    deleteCode: (code) => admin.del(`/api/admin/offers/codes/${encodeURIComponent(code)}`),
    createBanner: (text) => admin.post('/api/admin/offers/banners', { text }),
    deleteBanner: (id) => admin.del(`/api/admin/offers/banners/${encodeURIComponent(id)}`),
    setSaleTag: (id, label) => admin.put(`/api/admin/offers/sale-tags/${encodeURIComponent(id)}`, { label }),
  },
  calculateMatch: (productId, image) => postJson('/api/calculate-match', { productId, image }),
  stylingSuggestions: (productId, image, match) => postJson('/api/styling-suggestions', { productId, image, match }),
  recommendations: (history) => postJson('/api/recommendations', { ...history, consent: true }),
};
