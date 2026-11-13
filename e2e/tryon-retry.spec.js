import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/samples/sample-model.svg');

test('a failed try-on shows a friendly error with Retry Try-On, and retry succeeds', async ({ page, request }) => {
  const res = await request.post('/api/auth/signup', { data: { name: 'Retry', email: `retry-${Date.now()}@example.com`, password: 'secret1' } });
  const { token, user } = await res.json();
  await page.addInitScript(([t, u]) => {
    localStorage.setItem('fitstyle:token', t);
    localStorage.setItem('fitstyle:user', u);
  }, [token, JSON.stringify(user)]);

  let calls = 0;
  await page.route('**/api/try-on', (route) => {
    calls += 1;
    if (calls === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Our AI fitting room is busy right now. Please try again in a moment.', retryable: true }) });
    return route.continue();
  });

  await page.goto('/try-on?product=aurelia-satin-slip');
  await page.getByTestId('photo-input').setInputFiles(SAMPLE);
  await page.getByTestId('try-on-button').click();
  await expect(page.getByTestId('try-on-error')).toContainText('busy right now');
  await expect(page.getByTestId('try-on-result')).toHaveCount(0);
  await page.getByTestId('retry-try-on').click();
  await expect(page.getByTestId('try-on-result')).toBeVisible();
  await expect(page.getByTestId('try-on-error')).toHaveCount(0);
});
