import { test, expect } from '@playwright/test';

let consoleErrors;
test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (msg) => msg.type() === 'error' && !/401|Unauthorized/.test(msg.text()) && consoleErrors.push(msg.text()));
  page.on('pageerror', (err) => consoleErrors.push(err.message));
});
test.afterEach(() => {
  expect(consoleErrors, `console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
});

test('guest browses and wishlists; cart, try-on and checkout prompt for login', async ({ page }) => {
  await page.goto('/');
  const modal = page.getByTestId('auth-modal');
  await expect(modal).toBeVisible();
  await page.getByTestId('continue-guest').click();
  await expect(modal).toBeHidden();
  await expect(page.getByTestId('login-button')).toContainText('Guest');

  await page.goto('/product/emerald-wrap-midi');
  await page.getByTestId('add-to-wishlist').click();
  await expect(page.getByTestId('wishlist-count')).toHaveText('1');

  await page.getByTestId('try-on-now').click();
  await expect(modal).toBeVisible();
  await expect(page.getByTestId('auth-reason')).toContainText('Virtual Try-On');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/product\/emerald-wrap-midi/);

  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('auth-reason')).toContainText('bag');
  await page.getByTestId('auth-tab-signup').click();
  await page.getByTestId('auth-name').fill('Guest Convert');
  await page.getByTestId('auth-email').fill(`guest-${Date.now()}@example.com`);
  await page.getByTestId('auth-password').fill('secret1');
  await page.getByTestId('auth-submit').click();
  await expect(modal).toBeHidden();
  await expect(page.getByTestId('cart-count')).toHaveText('1');
  await expect(page.getByTestId('user-name')).toHaveText('Guest Convert');
  await expect(page.getByTestId('wallet-balance')).toContainText('$50');

  await page.getByTestId('logout').click();
  await expect(page.getByTestId('login-button')).toBeVisible();
  await page.goto('/cart');
  await page.getByTestId('continue-guest').click();
  await page.getByTestId('checkout').click();
  await expect(page.getByTestId('auth-reason')).toContainText('check out');
});

test('admin portal: login, dashboard, product CRUD and offers', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByTestId('admin-login')).toBeVisible();
  await page.getByTestId('admin-email').fill('admin@fitstyle.ai');
  await page.getByTestId('admin-password').fill('wrong');
  await page.getByTestId('admin-submit').click();
  await expect(page.getByRole('alert')).toContainText('Incorrect');
  await page.getByTestId('admin-password').fill('admin123');
  await page.getByTestId('admin-submit').click();
  await expect(page.getByTestId('admin-dashboard')).toBeVisible();
  const total = Number(await page.getByTestId('stat-products').textContent());
  expect(total).toBeGreaterThan(20);

  await page.getByTestId('admin-tab-products').click();
  await page.getByTestId('add-product').click();
  await page.getByTestId('pf-name').fill('E2E Silk Saree');
  await page.getByTestId('pf-audience').selectOption('Women');
  await page.getByTestId('pf-category').selectOption('Dresses');
  await page.getByTestId('pf-sub').selectOption('Ethnic');
  await page.getByTestId('pf-price').fill('180');
  await page.getByTestId('pf-stock').fill('5');
  await page.getByTestId('pf-image').fill('/images/products/scarlet-chiffon-midi.jpg');
  await page.getByTestId('pf-save').click();
  const row = page.getByTestId('row-e2e-silk-saree');
  await expect(row).toContainText('Ethnic');
  await row.getByRole('button', { name: /Edit/ }).click();
  await page.getByTestId('pf-price').fill('199');
  await page.getByTestId('pf-save').click();
  await expect(row).toContainText('$199');

  await page.getByTestId('admin-tab-offers').click();
  await page.getByTestId('code-input').fill('E2E15');
  await page.getByTestId('code-percent').fill('15');
  await page.getByTestId('code-add').click();
  await expect(page.getByTestId('code-list')).toContainText('E2E15');
  await page.getByTestId('banner-input').fill('E2E mega sale is live');
  await page.getByTestId('banner-add').click();
  await page.getByTestId('tag-product').selectOption('e2e-silk-saree');
  await page.getByTestId('tag-label').fill('NEW');
  await page.getByTestId('tag-add').click();

  await page.getByTestId('admin-tab-dashboard').click();
  await expect(page.getByTestId('stat-products')).toHaveText(String(total + 1));
  await expect(page.getByTestId('stat-offers')).toHaveText('3');

  await page.goto('/product/e2e-silk-saree');
  await page.getByTestId('continue-guest').click();
  await expect(page.getByRole('heading', { name: 'E2E Silk Saree' })).toBeVisible();
  await expect(page.getByTestId('announcement')).toContainText('E2E mega sale is live');

  await page.goto('/admin');
  await page.getByTestId('admin-tab-products').click();
  page.once('dialog', (d) => d.accept());
  await page.getByTestId('row-e2e-silk-saree').getByRole('button', { name: /Delete/ }).click();
  await expect(page.getByTestId('row-e2e-silk-saree')).toHaveCount(0);
});
