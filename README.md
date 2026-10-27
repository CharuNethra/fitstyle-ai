# FitStyle AI

An AI-powered luxury clothing store: pick any outfit, upload a full-body photo, and FitStyle AI renders a **virtual try-on**, computes an **AI Match Score** with a "why it works" breakdown, and styles the **complete look** (hairstyles, accessories, footwear). Personalised dress recommendations are shown **only after explicit consent**.

Runs fully out-of-the-box: with no API keys the backend uses a built-in mock AI pipeline (Sharp-based compositing + a rule-based stylist), so every flow works locally. Add keys to switch to real providers.

## Tech stack

| Layer | Tech |
| --- | --- |
| Frontend | React 19 + Vite, React Router, Tailwind CSS, Lucide React |
| Backend | Node.js + Express, Multer (uploads), Sharp (image processing) |
| Virtual try-on | Free open-source IDM-VTON / OOTDiffusion on Hugging Face Spaces via `@gradio/client` (default), or Fal.ai / FASHN (paid), or built-in mock |
| Match score & styling | OpenAI GPT-4o (vision) or Google Gemini, or built-in rule engine |
| Tests | Node test runner + Supertest (API), Playwright (E2E) |

## Features

- **Catalogue** – 26 products (real product photos in `public/images/products/`, the rest rendered as vector illustrations), category filter (Dresses, Tops, Outerwear, Casual, Formal), search and sort.
- **Product page** – size picker with **Try On Now**, **Add to Cart** and **Add to Wishlist**.
- **Try-On Studio** (`/try-on`) – choose an outfit, drag-and-drop / browse a photo (or use the sample model), click **Try On**:
  1. `/api/try-on` composites the garment onto your photo,
  2. `/api/calculate-match` returns e.g. *"88% Match for your curvy silhouette and warm tone"* plus a breakdown (fit, colour harmony, contrast, seasonal compatibility, versatility),
  3. `/api/styling-suggestions` fills the **AI Complete Look Suggestions** section (hairstyles, accessories, footwear).
- **Consent-gated recommendations** (`/for-you`) – wishlist, cart and search history are tracked locally. Before anything personalised is shown a modal asks *"Would you like to see personalized dress recommendations based on your recent wishlist, cart, and search history?"*
  - **YES, Show Recommendations** → curated grid of dresses ranked from your history.
  - **NO, Clear Preferences** → nothing is shown and the tracked history is wiped. The API also refuses requests without `consent: true`.
- **Cart** with quantity controls, shipping/tax summary and a validated **checkout simulation**; **Wishlist** page with move-to-bag.

## Run locally

Prerequisites: **Node.js 20+** and npm.

```bash
git clone https://github.com/CharuNethra/fitstyle-ai.git
cd fitstyle-ai
npm install
cp .env.example .env      # optional – only needed for real AI providers
npm run dev
```

- Web app: http://localhost:5173 (Vite, proxies `/api` to the backend)
- API: http://localhost:5001 (`GET /api/health` shows which providers are active)

Production build (Express serves the built frontend and API on one port):

```bash
npm run build
npm start                  # http://localhost:5001
```

## Adding AI API keys

All keys are optional and go in **`.env`** at the project root (copy from [`.env.example`](.env.example)). Restart `npm run dev` after editing. The first configured provider in each group is used; if a provider call fails the server logs it and falls back to the mock so the UI never breaks.

```dotenv
# Virtual try-on (default: free Hugging Face Spaces, no key needed)
TRYON_PROVIDER=huggingface                    # huggingface | fal | fashn | mock
HF_TOKEN=hf_...                               # optional, free: raises the ZeroGPU daily quota
HF_TRYON_SPACES=yisol/IDM-VTON,Nymbo/Virtual-Try-On
HF_DRESS_SPACE=levihsu/OOTDiffusion           # tried first for dresses/gowns
FAL_KEY=...                                   # TRYON_PROVIDER=fal, https://fal.ai/dashboard/keys
FAL_TRYON_MODEL=fal-ai/fashn/tryon/v1.6       # or fal-ai/kling/v1-5/kolors-virtual-try-on (Kling VTON)
FASHN_API_KEY=...                             # https://app.fashn.ai/api (direct FASHN v1.6)

# Match score + complete-look styling (vision LLM)
OPENAI_API_KEY=...                            # https://platform.openai.com/api-keys
OPENAI_MODEL=gpt-4o
GEMINI_API_KEY=...                            # https://aistudio.google.com/app/apikey
GEMINI_MODEL=gemini-3-flash-preview          # falls back to other Gemini models on 503/429/timeouts
```

### Free try-on on Hugging Face

With the default `TRYON_PROVIDER=huggingface`, [`server/services/hfTryOn.js`](server/services/hfTryOn.js) pads your photo to 3:4, sends it with the product photo to the public [IDM-VTON](https://huggingface.co/spaces/yisol/IDM-VTON) Space (mirror: `Nymbo/Virtual-Try-On`), and crops the result back to your photo's frame; dresses try [OOTDiffusion](https://huggingface.co/spaces/levihsu/OOTDiffusion)'s dress model first. A run takes ~20–60 s. Limits to know:

- These Spaces run on ZeroGPU, which has a small **daily GPU quota per visitor/IP** when anonymous. Set a free `HF_TOKEN` to get a larger quota. When the quota is used up the app falls back to the mock preview and says so.
- IDM-VTON only replaces **upper-body** garments; a dress sent to it comes back as a top. OOTDiffusion handles dresses.
- Public Spaces can be paused or busy; the next Space in the list is tried, then the mock.

Where the keys are used: [`server/config.js`](server/config.js) (provider selection), [`server/services/tryOn.js`](server/services/tryOn.js) (Hugging Face / Fal.ai / FASHN), [`server/services/vision.js`](server/services/vision.js) (OpenAI / Gemini). Keys are only read on the server and never sent to the browser. `.env` is git-ignored.

### Adding product photos

Drop an image into `public/images/products/` and set `image: '/images/products/<file>.jpg'` on the product in [`shared/products.js`](shared/products.js) (optional: `imageFit: 'contain' | 'cover'`, `imageBg`, `tryOnCategory: 'auto' | 'tops' | 'bottoms' | 'one-pieces'`). The photo is used in the catalogue and is sent to the try-on model as the garment reference.

## API

| Method | Route | Body | Returns |
| --- | --- | --- | --- |
| GET | `/api/health` | – | active providers |
| GET | `/api/products`, `/api/products/:id` | – | catalogue |
| POST | `/api/try-on` | multipart `photo` (or JSON `photo` data URL) + `productId` | `{ productId, image, provider, warning? }` |
| POST | `/api/calculate-match` | `{ productId, image }` | `{ score, headline, bodyShape, skinTone, breakdown[], provider }` |
| POST | `/api/styling-suggestions` | `{ productId, image?, match? }` | `{ stylistNote, hairstyles[], accessories[], footwear[], provider }` |
| POST | `/api/recommendations` | `{ consent: true, wishlist[], cart[], searches[] }` | `{ items[], signals[], personalized }` (403 without consent) |

Uploads: JPEG, PNG, WEBP, GIF, AVIF or SVG, max 12 MB.

## Tests

```bash
npm run lint
npm test                   # API tests (node:test + supertest)
npx playwright install chromium   # first time only
npm run test:e2e           # end-to-end browser flows on isolated ports 5174/5055 with `TRYON_PROVIDER=mock` and AI keys blanked; fails on any console error
```

The E2E suite covers category filtering and search, product → cart → quantity → checkout, wishlist management, upload (file input, drag-and-drop, sample) → try-on → match score → complete look, and both consent paths (YES shows the grid, NO clears history).

## Project structure

```
server/            Express app, routes and AI services (try-on, vision, stylist, recommendations)
  test/            API tests
shared/            Product catalogue + SVG garment renderer (used by client and server)
src/               React app
  components/      Header, modals, dropzone, score ring, product cards…
  context/         Cart / wishlist / interaction-history / consent store
  pages/           Home, Shop, ProductDetail, TryOn, Cart, Wishlist, ForYou
e2e/               Playwright tests
public/            Favicon, sample model, product photos (images/products/)
```

## Privacy notes

Photos are processed in memory only to generate the try-on and are never stored. Interaction history lives in your browser's `localStorage`; recommendation consent is asked per session and choosing **NO** clears the history.
