import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCTS, getProduct } from '../shared/products.js';
import { normalizePhoto, dataUrlToBuffer } from './services/imageUtils.js';
import { runTryOn } from './services/tryOn.js';
import { calculateMatch, stylingSuggestions } from './services/stylist.js';
import { recommend } from './services/recommend.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAX_UPLOAD = 12 * 1024 * 1024;
const ALLOWED = /^image\/(jpeg|png|webp|gif|avif|svg\+xml)$/;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const requireProduct = (id) => {
  const product = getProduct(id);
  if (!product) throw new HttpError(404, `Unknown productId "${id}"`);
  return product;
};

const requireImage = (image) => {
  if (!image || typeof image !== 'string') throw new HttpError(400, 'An "image" (data URL or https URL) is required');
  if (!image.startsWith('data:image/') && !/^https:\/\//.test(image)) {
    throw new HttpError(400, 'Image must be a data:image/* URL or an https URL');
  }
  return image;
};

export function createApp(config) {
  const app = express();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED.test(file.mimetype)) cb(null, true);
      else cb(new HttpError(415, 'Please upload a JPG, PNG, WEBP, GIF, AVIF or SVG image'));
    },
  });

  app.use(cors());
  app.use(express.json({ limit: '20mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, providers: { tryOn: config.tryOnProvider, vision: config.visionProvider } });
  });

  app.get('/api/products', (_req, res) => res.json({ products: PRODUCTS }));

  app.get('/api/products/:id', (req, res) => res.json({ product: requireProduct(req.params.id) }));

  app.post('/api/try-on', upload.single('photo'), async (req, res) => {
    const product = requireProduct(req.body?.productId);
    let raw = req.file?.buffer;
    if (!raw && req.body?.photo) raw = dataUrlToBuffer(req.body.photo);
    if (!raw) throw new HttpError(400, 'A full-body "photo" upload is required');
    let photo;
    try {
      photo = await normalizePhoto(raw);
    } catch {
      throw new HttpError(422, 'We could not read that image. Please try a different photo.');
    }
    const result = await runTryOn(photo, product, config);
    res.json({ productId: product.id, ...result });
  });

  app.post('/api/calculate-match', async (req, res) => {
    const product = requireProduct(req.body?.productId);
    const image = requireImage(req.body?.image);
    res.json(await calculateMatch(product, image, config));
  });

  app.post('/api/styling-suggestions', async (req, res) => {
    const product = requireProduct(req.body?.productId);
    const image = req.body?.image ? requireImage(req.body.image) : null;
    res.json(await stylingSuggestions(product, image, config, req.body?.match));
  });

  app.post('/api/recommendations', (req, res) => {
    const { wishlist, cart, searches, consent } = req.body || {};
    if (consent !== true) throw new HttpError(403, 'Personalised recommendations require explicit consent');
    const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 50) : []);
    res.json(recommend({ wishlist: arr(wishlist), cart: arr(cart), searches: arr(searches) }));
  });

  app.use('/api', () => {
    throw new HttpError(404, 'Not found');
  });

  const dist = path.resolve(__dirname, '../dist');
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    let status = err.status || 500;
    let message = err.message || 'Internal server error';
    if (err instanceof multer.MulterError) {
      status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      message = err.code === 'LIMIT_FILE_SIZE' ? 'Photo is too large (max 12 MB)' : err.message;
    } else if (err.type === 'entity.too.large') {
      status = 413;
      message = 'Request body too large';
    }
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Something went wrong. Please try again.' : message });
  });

  return app;
}
