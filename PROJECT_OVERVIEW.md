# FitStyle AI: Project Overview (Beginner's Guide)

FitStyle AI is an online clothing shop where you can **see an outfit on your own photo before buying it**. AI also tells you how well the outfit suits you and what hair, accessories and shoes would complete the look.

This guide explains the project in plain language so you can describe it confidently, for example in an interview.

---

## 1. Technologies Used & Why We Used Them

| Tool | What it is | Why we chose it |
|------|------------|-----------------|
| **React** | A popular library for building web pages out of small reusable pieces called "components" (for example, one product card design reused for every item). | It keeps the interface organised, and it updates instantly when things change, like adding an item to the cart. |
| **Vite** | A development tool that runs the website on your computer while you build it and packages it for the internet. | It is very fast: changes appear in the browser almost instantly, which speeds up building and testing. |
| **Node.js** | A way to run JavaScript on a server (a computer in the background), not just in the browser. | We use the same language (JavaScript) for the front end and the back end, so the project is simpler to build and maintain. |
| **Express** | A lightweight toolkit on top of Node.js for creating a server and its web addresses, such as `/api/try-on`. | It is simple and widely used. We use it to receive photos, call the AI services and send results back to the page. |
| **Google Gemini API** | Google's AI that can look at images and write about them. One version can also create images. | It powers both the virtual try-on (its image model dresses the user's photo) and the AI stylist (match score and styling tips), so one service and one key run all the AI. |
| **Vercel** | A hosting platform that puts the website online and runs the server code automatically. | It deploys a new version every time we push code to GitHub, and it is free for a project of this size. |

> Also used: **Tailwind CSS** (styling and colours), **Lucide** (icons), **Sharp** (image resizing on the server) and **Playwright** (automatic browser tests).

---

## 2. Application Workflow

What happens when a user tries on an outfit:

1. **Choose an outfit.** The user browses the shop (dresses, tops, outerwear, casual, formal) and clicks **"Try On Now"** on a product.
2. **Upload a photo.** The user drags in a full-body photo or picks one from their device. A sample photo is also available.
3. **Shrink for upload.** The browser shrinks very large photos so they upload quickly.
4. **Send to the server.** When the user clicks **"Try On"**, the photo and the chosen product go to our Express server.
5. **Clean the images.** The server tidies both images to a standard size and shape (see Section 5).
6. **Create the try-on image.** The server sends the image pair to Google Gemini's image model, which returns a new picture of the user wearing the outfit.
7. **Score it.** The finished picture goes to Google Gemini, which returns a **match score** with a 5-point explanation.
8. **Style it.** Gemini also suggests **3 hairstyles, 3 accessories and 3 pairs of shoes**.
9. **Show the results.** The page shows the try-on image (with an Original/Compare toggle), the score and the styling ideas.
10. **Keep shopping.** The user can add the item to the cart or wishlist and go through a pretend checkout.

**Safety net:** if the try-on AI is busy, the server retries once. If it is still busy, the page shows "Our Try-on is busy right now, try again later" with a **Try Again** button, and never a fake or pasted image. If the stylist AI is unavailable, built-in suggestions are shown with a small notice.

**Privacy:** personalised dress recommendations appear only if the user clicks **YES**. Clicking **NO** hides them and clears the saved browsing history.

---

## 3. Virtual Try-On Engine (Google Gemini)

In plain English, this is how the try-on works:

1. **Two pictures go in.** The AI gets an *image pair*: the user's photo and a photo of the garment.
2. **It studies the person.** The AI finds the body: where the shoulders, arms, waist and legs are, and which area the clothing should cover.
3. **It studies the garment.** The AI learns the garment's colour, pattern, fabric and shape.
4. **It "drapes" the garment.** The AI repaints the clothing area of the person's photo with the new garment, bending it to the body's pose and adding realistic folds, shadows and lighting.
5. **It keeps the rest.** The face, hair, skin tone and background stay as they were.
6. **One picture comes out.** The server crops it back to the shape of the original photo and sends it to the web page.

**Which model we use:** Google Gemini's image model, `gemini-3.1-flash-image`, with `gemini-2.5-flash-image` as a backup. The server sends both pictures with written instructions: keep the person's face, skin tone, pose and background exactly the same, and copy the garment's colour, fabric and design faithfully.

**If it is busy:** if Gemini is overloaded or out of quota, the server tries the backup model, waits two seconds and tries everything once more. If it still fails, the user sees a clear message and a Try Again button instead of a broken image.

---

## 4. AI Fashion Stylist (Google Gemini)

After the try-on picture is ready, Gemini acts as a personal stylist.

**What we send:** the try-on picture plus the product details (name, colour, fabric, category), and a request along the lines of: *"Judge how well this outfit suits this person using fashion rules, and suggest what completes the look."*

**How Gemini judges compatibility:** it looks at the person in the image and checks the outfit against 5 common fashion rules:

| Factor | What it means |
|--------|---------------|
| **Fit & Silhouette** | Does the garment's shape flatter this body shape? |
| **Colour Harmony** | Does the colour suit the person's skin tone? |
| **Colour Contrast** | Does it stand out nicely against hair, skin and background? |
| **Seasonal Compatibility** | Which season or weather does it suit? |
| **Style Versatility** | How many occasions could it be worn to? |

**The match score:** each factor gets a rating, and these combine into one overall score, for example **"84% Match for your athletic build and warm undertone"**. Each factor also gets a one-sentence reason.

**Complete-look suggestions:** Gemini then recommends:

- **3 hairstyles** (for example, Sleek Low Bun)
- **3 accessories** (for example, Gold Drop Earrings)
- **3 footwear options** (for example, Gold Strappy Sandals)

Each one comes with a short reason it works with this outfit.

**Reliability:** Gemini replies in a fixed, structured format so the app can read it reliably. If one Gemini version is busy, the app tries another. If none respond, it uses built-in suggestions.

---

## 5. Critical Image Optimizations for AI Accuracy

AI try-on models are picky: **good input gives good output**. So before anything goes to the AI, the server automatically prepares both images. We call this *preprocessing*.

### Why 768x1024 and a 3:4 shape?

- Virtual try-on models **work best with portrait images of 768 x 1024 pixels** (a 3:4 width-to-height ratio).
- A photo of a different size or shape gets squashed or stretched to fit, which causes **blurriness, distorted bodies or cut-off heads and feet**.
- So the server **fits every user photo into a 768x1024 portrait frame without stretching the person**. It adds a little extra edge around the photo instead of squashing it.
- Once the AI finishes, the server **crops the result back to the original photo's shape**, so the final picture looks natural.

### Why centre the garment?

- The server **trims empty space around the garment**, **centres it** and gives it a small margin on a 768x1024 canvas.
- That way the AI always sees the garment at a consistent size and position, so it is less likely to misread the clothing's shape or proportions.

### Why flat-lay dress images on plain white backgrounds?

- A **flat-lay** image shows only the garment, with no model, laid out or photographed on a **plain white background**.
- With a busy background or a model wearing scarves, bags or jewellery, the AI may **copy those extras onto the user**. We saw this happen in testing.
- A clean white background makes it obvious **which part is the clothing**, so the AI copies the garment accurately.
- Any see-through (transparent) areas in product images are filled with white for the same reason.

**Result:** sharper, more realistic try-on images, with fewer distortions and fewer odd mistakes.

---

## In One Sentence

FitStyle AI is a React and Express clothing shop, hosted on Vercel, where Google Gemini puts outfits onto the user's own photo, and Gemini scores the fit and suggests hairstyles, accessories and shoes. Careful image preparation keeps the results sharp and realistic.
