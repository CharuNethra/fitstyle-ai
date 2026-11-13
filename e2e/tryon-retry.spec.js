import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/samples/sample-model.svg');

test('when Gemini is unavailable the page shows the busy message and Try Again, with no image', async ({ page, request }) => {
  const res = await request.post('/api/auth/signup', { data: { name: 'Retry', email: `retry-${Date.now()}@example.com`, password: 'secret1' } });
  const { token, user } = await res.json();
  await page.addInitScript(([t, u]) => {
    localStorage.setItem('fitstyle:token', t);
    localStorage.setItem('fitstyle:user', u);
  }, [token, JSON.stringify(user)]);

  // First call reaches the real E2E server, which has no Gemini key and returns the busy 503; the retry is stubbed.
  let calls = 0;
  await page.route('**/api/try-on', (route) => {
    calls += 1;
    if (calls === 1) return route.continue();
    return route.fulfill({ json: { image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzIiBoZWlnaHQ9IjQiLz4=', provider: 'gemini' } });
  });

  await page.goto('/try-on?product=aurelia-satin-slip');
  await page.getByTestId('photo-input').setInputFiles(SAMPLE);
  await page.getByTestId('try-on-button').click();
  await expect(page.getByTestId('try-on-error')).toContainText('Our Try-on is busy right now, try again later');
  await expect(page.getByTestId('try-again')).toHaveText('Try Again');
  await expect(page.getByTestId('try-on-result')).toHaveCount(0);
  await page.getByTestId('try-again').click();
  await expect(page.getByTestId('try-on-result')).toBeVisible();
  await expect(page.getByTestId('try-on-error')).toHaveCount(0);
});

test('a failed Try-On with Current Look shows the busy message and Try Again retries the item', async ({ page, request }) => {
  const email = `layer-${Date.now()}@example.com`;
  const { token, user } = await (await request.post('/api/auth/signup', { data: { name: 'Layer', email, password: 'secret1' } })).json();
  await page.addInitScript(([t, u]) => {
    localStorage.setItem('fitstyle:token', t);
    localStorage.setItem('fitstyle:user', u);
  }, [token, JSON.stringify(user)]);
  const image = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzIiBoZWlnaHQ9IjQiLz4=';
  await page.route('**/api/try-on', (route) => route.fulfill({ json: { image, provider: 'gemini' } }));
  let layerCalls = 0;
  await page.route('**/api/try-on/layer', (route) => {
    layerCalls += 1;
    return layerCalls === 1 ? route.fulfill({ status: 500, body: 'oops' }) : route.fulfill({ json: { image, provider: 'gemini' } });
  });
  await page.goto('/try-on?product=scarlet-cocktail&add=gold-chain-clutch');
  await page.getByTestId('photo-input').setInputFiles(SAMPLE);
  await page.getByTestId('try-on-button').click();
  await expect(page.getByTestId('try-on-result')).toBeVisible();
  await page.getByTestId('try-with-look').first().click();
  await expect(page.getByTestId('try-on-error')).toHaveText(/Our Try-on is busy right now, try again later/);
  await page.getByTestId('try-again').click();
  await expect(page.getByTestId('try-on-error')).toHaveCount(0);
  await expect(page.getByTestId('undo-layer')).toBeEnabled();
  expect(layerCalls).toBe(2);
});
