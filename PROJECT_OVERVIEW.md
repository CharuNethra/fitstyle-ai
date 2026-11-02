# FitStyle AI: How We Built It (Beginner's Guide)

This guide explains, in plain language, how the FitStyle AI virtual try-on shop was built. You don't need any coding knowledge to read it.

---

## Step 1: What the App Does

FitStyle AI is an online clothing shop where you can **see clothes on yourself before you buy them**.

What a shopper does, step by step:

1. **Browse the shop.** There are 26 items (dresses, tops, outerwear, casual and formal wear), and you can filter by category or search.
2. **Pick an outfit** and open its product page.
3. **Upload a full-body photo** of yourself. You can drag it onto the page or choose it from your computer. There is also a sample photo you can use instead.
4. **Click "Try On".** A few seconds later, AI shows you a picture of yourself wearing the outfit.
5. **See your match score**, for example "84% Match", with a short explanation of why the outfit suits you.
6. **Get styling tips**: hairstyles, accessories and shoes that go with the outfit.
7. **Shop as normal**: add items to your cart or wishlist and go through a pretend checkout. No real payment is taken.
8. **Personal picks, only if you say yes.** On the "For You" page, the app first asks: *"Would you like to see personalized dress recommendations based on your recent wishlist, cart, and search history?"*
   - **YES** shows dresses picked to match your taste.
   - **NO** hides the picks and forgets what you browsed.

---

## Step 2: The UI & Setup (How the Web Page Was Built)

The app has two halves:

| Part | What it is | Simple comparison |
|------|-------------|-------------------|
| **Front end** | The web pages you see and click | The shop floor |
| **Back end** | A server that does the heavy work and talks to the AI services | The back office |

**How the pages were built:**

- **React** builds the pages out of small, reusable pieces called *components*. For example, one "product card" design is reused for every item in the shop, so a change to that design updates every card at once.
- **Tailwind CSS** handles the look: colours, spacing and fonts. We went for a clean, luxury style with cream, black and gold.
- **Lucide icons** supply the small icons, such as the heart for wishlist and the bag for cart.
- **Vite** is the tool that runs the site while we work on it and packages it for the web.

**The main pages:** Home, Shop, Product page, Try-On Studio, Cart, Wishlist and "For You".

**Remembering your choices:** the cart, wishlist and recent searches are saved in your own browser, so they are still there when you come back.

**Testing:** we wrote automatic tests that click through the app like a real person would (shop, add to cart, upload a photo, try on, say yes or no to recommendations). If anything breaks or shows an error, the tests fail and tell us.

**Where it lives:** the code is stored on GitHub and the website runs on Vercel.

---

## Step 3: The Virtual Try-On Feature (How AI Puts Clothes on Your Photo)

The try-on feature is the heart of the app. In plain terms:

1. The app takes **two pictures**: your photo, and a photo of the garment.
2. It sends both to an **AI image model**. This is a program that has learned from millions of pictures what clothes look like on people.
3. The AI works out where your body, arms and pose are, and **"repaints" you wearing the new garment**, with natural folds, lighting and shadows.
4. The finished picture comes back to the app and appears next to your original photo, so you can compare them.

**How Hugging Face fits in:**
Hugging Face is a website that hosts free, open-source AI models. We used two of them:

- **IDM-VTON** for tops and shirts.
- **OOTDiffusion** for dresses, because it can replace the whole outfit and not just the top half.

The app talks to these models over the internet with a small helper tool (`@gradio/client`).

**Why we later switched to Google Gemini:**
The free Hugging Face service has a small daily usage limit, and it was often busy or out of quota. So **Try On now uses Google's Gemini image model by default**. It is faster (around 10 seconds), handles both tops and dresses, and keeps your face and background the same. Hugging Face is still built in as a backup option.

**Safety net:** if the AI service is busy, down or out of quota, the app does not crash. It shows a simple preview image and a small notice explaining what happened.

---

## Step 4: The AI Stylist Feature (Scores and Styling Tips from Gemini)

Once the try-on picture is ready, the app asks **Google Gemini** to act as a personal stylist. Gemini is an AI that can look at an image and describe it in words.

**What we ask Gemini:**
"Look at this person wearing this outfit, and tell us how well it suits them and what would complete the look."

**What Gemini sends back:**

1. **A match score** from 0 to 100%, for example "84% Match for your athletic build and warm undertone".
2. **Why it works**, rated on 5 points:
   - Fit & silhouette (how the shape suits your body)
   - Colour harmony (how the colour suits your skin tone)
   - Colour contrast
   - Seasonal fit (which time of year it suits)
   - Versatility (how many occasions you could wear it to)
3. **Complete-look suggestions**: 3 hairstyles, 3 accessories and 3 pairs of shoes, each with a one-line reason.

**Safety net:** if Gemini is busy, the app tries a few other Gemini versions. If none of them answer, it shows built-in suggestions instead, so the page always has something useful on it.

---

## Step 5: Image Fixes (Why 768x1024 and Flat-Lay Photos?)

AI try-on models are picky about the pictures you give them. Good input means good output, so the app tidies up every image before sending it.

**Why resize to 768x1024?**

- The AI models were trained on portrait pictures of exactly this shape (768 pixels wide by 1024 tall, a 3:4 ratio).
- If a photo is a different shape, the AI may stretch it, cut off feet or heads, or produce a blurry result.
- So the app automatically **fits your photo into a 768x1024 frame without stretching you**. It adds a little extra edge where needed.
- After the AI finishes, the app **crops the result back to your original photo's shape**, so it looks natural.

**Why clean flat-lay garment photos?**

- A *flat-lay* photo shows the garment on its own, laid flat or on a plain white background, with no model wearing it.
- If the garment photo includes a model with a scarf, handbag or jewellery, the AI may copy those extras onto you too. We saw this happen in testing.
- A clean white background tells the AI exactly which part is the clothing.
- The app also **trims empty space around the garment, centres it and pads it with white** to the same 768x1024 size.

**Result:** cleaner, more realistic try-on pictures with fewer strange mistakes.

---

## In One Sentence

FitStyle AI is a stylish online shop where AI puts the clothes on your own photo, scores how well they suit you, suggests hair, accessories and shoes, and only gives personal recommendations when you agree.
