# FitStyle AI

An AI-powered luxury clothing store: pick any outfit, upload a full-body photo, and FitStyle AI renders a **virtual try-on**, computes an **AI Match Score** with a "why it works" breakdown, and styles the **complete look** (hairstyles, accessories, footwear). Personalised dress recommendations are shown **only after explicit consent**.

Virtual try-on runs on Google Gemini and needs `GEMINI_API_KEY`. Without AI keys, the match score and styling use a built-in rule-based stylist, and the Try-On page shows a "busy" message instead of a result.

## Tech stack

| Layer | Tech |
| --- | --- |
| Frontend | React 19 + Vite, React Router, Tailwind CSS, Lucide React |
| Backend | Node.js + Express, Multer (uploads), Sharp (image processing) |
| Virtual try-on | Google AI Studio Gemini image model only (`gemini-3.1-flash-image`, falling back to `gemini-2.5-flash-image`) |
| Match score & styling | OpenAI GPT-4o (vision) or Google Gemini, or built-in rule engine |
| Tests | Node test runner + Supertest (API), Playwright (E2E) |

## Features

- **Catalogue** – 26 products (real product photos and a flat-lay image in `public/images/products/`, the rest rendered as vector illustrations), category filter (Dresses, Tops, Outerwear, Casual, Formal), search and sort.
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

Keys go in **`.env`** at the project root (copy from [`.env.example`](.env.example)). Restart `npm run dev` after editing. Virtual try-on needs `GEMINI_API_KEY`. Match score and styling use the first configured vision provider and fall back to the built-in rule engine.

```dotenv
# Virtual try-on (Gemini only)
GEMINI_IMAGE_MODEL=gemini-3.1-flash-image     # try-on image model; falls back to gemini-2.5-flash-image

# Match score + complete-look styling (vision LLM)
OPENAI_API_KEY=...                            # https://platform.openai.com/api-keys
OPENAI_MODEL=gpt-4o
GEMINI_API_KEY=...                            # https://aistudio.google.com/app/apikey
GEMINI_MODEL=gemini-3-flash-preview          # falls back to other Gemini models on 503/429/timeouts
```

### Gemini try-on

[`server/services/geminiTryOn.js`](server/services/geminiTryOn.js) preprocesses both images (see below) and sends them with a try-on prompt to the Gemini image model from Google AI Studio (`GEMINI_IMAGE_MODEL`, default `gemini-3.1-flash-image`, falling back to `gemini-2.5-flash-image` and `gemini-3.1-flash-image-preview` on overload, rate limits or timeouts). If every model fails, the whole list is retried once after 2 s. The 3:4 result is cropped back to your photo's frame. Footwear and accessories added with "Try-On with Current Look" use the same models.

If Gemini is still rate-limited or busy after the retry, or `GEMINI_API_KEY` is missing, the API returns `503 {"error": "Our Try-on is busy right now, try again later", "retryable": true}` and the page shows that message with a **Try Again** button. No placeholder or composite image is ever shown. Image generation counts against your AI Studio quota.

Where the keys are used: [`server/config.js`](server/config.js), [`server/services/tryOn.js`](server/services/tryOn.js) and [`server/services/geminiTryOn.js`](server/services/geminiTryOn.js) (try-on), [`server/services/vision.js`](server/services/vision.js) (OpenAI / Gemini styling). Keys are only read on the server and never sent to the browser. `.env` is git-ignored.

### Image preprocessing

Before anything is sent to Gemini, [`server/services/preprocess.js`](server/services/preprocess.js) normalises both inputs to the models' native 768x1024 (3:4) resolution:

- **Garment** (`prepareGarment`) – transparency is flattened onto white, the empty background around the garment is trimmed, and the garment is centred on a clean white 768x1024 canvas with a small margin.
- **Person** (`preparePerson`) – the photo is auto-rotated, padded to 3:4 by repeating its edges (never stretched) and resized to 768x1024; `restorePersonFrame` crops the generated result back to the original photo's frame.

### Clean garment images

For the cleanest try-on, give a product a flat-lay image on a white background. A product can keep a worn/model photo in the shop and point the try-on at a separate clean image with `tryOnImage`, so accessories in the model photo are not copied onto the user. The Aurelia Satin Slip Dress ships with an AI-generated (FLUX.1-schnell) flat-lay image in `public/images/products/flat-lay/`.

### Adding product photos

Drop an image into `public/images/products/` and set `image: '/images/products/<file>.jpg'` on the product in [`shared/products.js`](shared/products.js) (optional: `imageFit: 'contain' | 'cover'`, `imageBg`, `tryOnImage` for a separate clean garment image, `tryOnCategory: 'auto' | 'tops' | 'bottoms' | 'one-pieces'`). The photo is used in the catalogue and, unless `tryOnImage` is set, is sent to the try-on model as the garment reference.

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
npm run test:e2e           # end-to-end browser flows on isolated ports 5174/5055 with AI keys blanked (the try-on API is stubbed in the browser); fails on any console error
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

## Deploying to Vercel

The repo includes a Vercel setup: [`vercel.json`](vercel.json) serves the Vite build and sends every `/api/*` request to [`api/index.js`](api/index.js), which runs the same Express app as a serverless function (300 s limit). In the Vercel project, open **Settings -> Environment Variables**, add `GEMINI_API_KEY` (plus any other keys from `.env.example`), then redeploy. `.env` is not deployed, so without `GEMINI_API_KEY` the Try-On page shows the busy message. Photos are downscaled in the browser to stay under Vercel's 4.5 MB request limit.

## Accounts, admin and checkout

- **Accounts:** sign up, log in or continue as a guest. Guests can browse and use the wishlist; cart, checkout and try-on ask them to log in. New accounts get a $50 FitStyle Wallet balance.
- **Forgot password:** "Forgot Password?" in the login window sends a reset link for `/reset-password?token=…`. The reply is always the same generic message, so it doesn't reveal which emails have accounts. Links are single-use, expire after 30 minutes, and sign the user out everywhere once used. No email service is configured, so the link is written to the server log; locally (not in production/Vercel) it is also shown in the window as a demo preview link. Admin credentials can't be reset this way.
- **Admin portal:** there is no link to it in the shop. Staff sign in at `/admin/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Locally the demo password `admin123` works; in production or on Vercel, admin login is disabled until `ADMIN_PASSWORD` is set. Guests and customers who open `/admin` are sent to the home page with an "Access Denied" message, and `/api/admin/*` returns 401 without an admin token and 403 for customer tokens.
- **Catalogue:** Women / Men / Kids → Dresses / Footwear / Accessories → style. Intimates / Innerwear is shown on a mannequin only, and personal-photo try-on is blocked for it in both the UI and the API.
- **Complete the look:** product pages suggest items from the other two categories. Each suggestion has an optional "Try-On with Current Look" button that adds it to your last try-on result.
- **Delivery and checkout:** enter a 6-digit pincode to see the estimated delivery time. Checkout supports discount codes, the FitStyle Wallet (deducted automatically) and simulated Cash on Delivery, UPI (Google Pay / PhonePe / Paytm) and card payments. No real money is charged.

