/* global DataTransfer */
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE = path.resolve(__dirname, '../public/samples/sample-model.svg');
const SHOTS = process.env.E2E_SCREENSHOTS;

let consoleErrors;

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (msg) => msg.type() === 'error' && consoleErrors.push(msg.text()));
  page.on('pageerror', (err) => consoleErrors.push(err.message));
});

test.afterEach(() => {
  expect(consoleErrors, `console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
});

const shot = async (page, name) => SHOTS && page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });

test('catalog filtering and search', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Try it on/ })).toBeVisible();
  await shot(page, '01-home');

  await page.goto('/shop');
  const all = await page.getByTestId('product-card').count();
  expect(all).toBeGreaterThanOrEqual(20);
  for (const cat of ['Dresses', 'Tops', 'Outerwear', 'Casual', 'Formal']) {
    await page.getByRole('tab', { name: cat }).click();
    await expect(page).toHaveURL(new RegExp(`category=${cat}`));
    const n = await page.getByTestId('product-card').count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(all);
  }
  await page.getByRole('tab', { name: 'Dresses' }).click();
  await shot(page, '02-shop-dresses');

  await page.getByTestId('header-search').fill('satin');
  await page.getByTestId('header-search').press('Enter');
  await expect(page).toHaveURL(/q=satin/);
  await expect(page.getByTestId('product-card').first()).toBeVisible();
  expect(await page.getByTestId('product-card').count()).toBeLessThan(all);
});

test('product page → cart → checkout, and wishlist management', async ({ page }) => {
  await page.goto('/product/emerald-wrap-midi');
  await expect(page.getByTestId('product-title')).toHaveText('Emerald Wrap Midi');
  await page.getByRole('button', { name: 'S', exact: true }).click();
  await page.getByTestId('add-to-cart').click();
  await page.getByTestId('add-to-cart').click();
  await page.getByTestId('add-to-wishlist').click();
  await expect(page.getByTestId('cart-count')).toHaveText('2');
  await expect(page.getByTestId('wishlist-count')).toHaveText('1');
  await shot(page, '03-product');

  await page.goto('/wishlist');
  await expect(page.getByTestId('wishlist-item')).toHaveCount(1);
  await shot(page, '04-wishlist');
  await page.getByTestId('move-to-cart').click();
  await expect(page.getByText('Your wishlist is empty')).toBeVisible();

  await page.goto('/cart');
  await expect(page.getByTestId('cart-item')).toHaveCount(2);
  await expect(page.getByTestId('subtotal')).toHaveText('$477.00');
  await page.getByRole('button', { name: 'Increase quantity' }).first().click();
  await expect(page.getByTestId('qty').first()).toHaveText('3');
  await expect(page.getByTestId('subtotal')).toHaveText('$636.00');
  await page.getByRole('button', { name: 'Decrease quantity' }).first().click();
  await expect(page.getByTestId('qty').first()).toHaveText('2');
  await shot(page, '05-cart');

  await page.getByTestId('checkout').click();
  await page.getByTestId('place-order').click();
  await expect(page.getByText('Enter a valid email')).toBeVisible();
  const modal = page.getByTestId('checkout-modal');
  await modal.locator('input[name=name]').fill('Ava Laurent');
  await modal.locator('input[name=email]').fill('ava@example.com');
  await modal.locator('input[name=address]').fill('12 Rue Saint-Honoré');
  await modal.locator('input[name=city]').fill('Paris');
  await modal.locator('input[name=zip]').fill('75001');
  await modal.locator('input[name=card]').fill('4242 4242 4242 4242');
  await modal.locator('input[name=expiry]').fill('12/28');
  await modal.locator('input[name=cvc]').fill('123');
  await page.getByTestId('place-order').click();
  await expect(page.getByTestId('order-confirmation')).toBeVisible();
  await shot(page, '06-checkout-confirmation');
  await page.getByRole('button', { name: 'Continue shopping' }).click();
  await expect(page.getByText('Your bag is empty')).toBeVisible();
});

test('virtual try-on → match score → complete look', async ({ page }) => {
  await page.goto('/product/noir-column-gown');
  await page.getByTestId('try-on-now').click();
  await expect(page).toHaveURL(/try-on\?product=noir-column-gown/);
  await expect(page.getByTestId('selected-product')).toHaveText('Noir Column Gown');
  await expect(page.getByTestId('try-on-button')).toBeDisabled();

  await page.getByTestId('pick-emerald-wrap-midi').click();
  await expect(page.getByTestId('selected-product')).toHaveText('Emerald Wrap Midi');

  await page.getByTestId('photo-input').setInputFiles(SAMPLE);
  await expect(page.getByTestId('photo-preview')).toBeVisible();
  await page.getByTestId('try-on-button').click();

  await expect(page.getByTestId('try-on-result')).toBeVisible();
  await expect(page.getByTestId('match-score')).toHaveText(/\d{2}%/);
  await expect(page.getByTestId('match-headline')).toContainText('% Match for your');
  await expect(page.getByTestId('breakdown-item')).toHaveCount(5);
  for (const id of ['hairstyles', 'accessories', 'footwear']) {
    await expect(page.getByTestId(id).locator('li')).toHaveCount(3);
  }
  await page.getByRole('button', { name: 'compare' }).click();
  await shot(page, '07-try-on-result');
});

test('try-on via drag & drop and sample model', async ({ page }) => {
  await page.goto('/try-on?product=camel-wool-coat');
  await page.getByTestId('use-sample').click();
  await expect(page.getByTestId('photo-preview')).toBeVisible();
  await page.getByRole('button', { name: 'Remove photo' }).click();

  const svg = await (await page.request.get('/samples/sample-model.svg')).text();
  const dt = await page.evaluateHandle((content) => {
    const d = new DataTransfer();
    d.items.add(new File([content], 'me.svg', { type: 'image/svg+xml' }));
    return d;
  }, svg);
  await page.getByTestId('dropzone').dispatchEvent('drop', { dataTransfer: dt });
  await expect(page.getByTestId('photo-preview')).toBeVisible();
  await page.getByTestId('try-on-button').click();
  await expect(page.getByTestId('match-score')).toBeVisible();
  await expect(page.getByTestId('complete-look')).toContainText('AI Complete Look Suggestions');
});

test('recommendations are consent-gated: NO clears history', async ({ page }) => {
  await page.goto('/product/scarlet-cocktail');
  await page.getByTestId('add-to-wishlist').click();
  await page.getByTestId('header-search').fill('satin');
  await page.getByTestId('header-search').press('Enter');

  await page.goto('/for-you');
  const modal = page.getByTestId('consent-modal');
  await expect(modal).toContainText('Would you like to see personalized dress recommendations based on your recent wishlist, cart, and search history?');
  await expect(page.getByTestId('recommendation-grid')).toHaveCount(0);
  await shot(page, '08-consent-modal');

  await page.getByTestId('consent-no').click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByTestId('recs-gated')).toContainText('Personalized recommendations are off');
  await expect(page.getByTestId('recommendation-grid')).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fitstyle:store:v1')).interactions);
  expect(stored).toEqual({ wishlist: [], cart: [], searches: [] });

  await page.getByTestId('open-consent').click();
  await expect(modal).toContainText('0');
  await page.getByTestId('consent-yes').click();
  await expect(page.getByTestId('recommendation-grid')).toBeVisible();
  await expect(page.getByTestId('signals')).toHaveCount(0);
});

test('recommendations are consent-gated: YES shows tailored grid', async ({ page }) => {
  await page.goto('/product/noir-column-gown');
  await page.getByTestId('add-to-wishlist').click();
  await page.goto('/product/scarlet-cocktail');
  await page.getByTestId('add-to-cart').click();
  await page.getByTestId('header-search').fill('satin');
  await page.getByTestId('header-search').press('Enter');

  await page.goto('/');
  await page.getByTestId('home-for-you').click();
  await expect(page.getByTestId('consent-modal')).toBeVisible();
  await page.getByTestId('consent-yes').click();
  await expect(page.getByTestId('recommendation-grid')).toBeVisible();
  await expect(page.getByTestId('signals')).toContainText('Noir Column Gown');
  await expect(page.getByTestId('signals')).toContainText('satin');
  const cards = page.getByTestId('recommendation-grid').getByTestId('product-card');
  expect(await cards.count()).toBeGreaterThan(3);
  await expect(cards.first()).toContainText('% match');
  await shot(page, '09-recommendations');

  await page.reload();
  await expect(page.getByTestId('consent-modal')).toHaveCount(0);
  await expect(page.getByTestId('recommendation-grid')).toBeVisible();
});
