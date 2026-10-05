// Sample solutions for the "Learn Locators" page.
// Run the site first (npm run dev), or change BASE to the GitHub Pages URL.
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:5173/my-simple-site/#/learn-locators';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE);
});

test('5. nested: Delete inside Shipping address', async ({ page }) => {
  await page.locator('#shipping').getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('#result-5')).toHaveText('Correct: nested');
});

test('6. deeply nested: Confirm link', async ({ page }) => {
  await page.locator('#app-shell').getByRole('link', { name: 'Confirm' }).click();
  await expect(page.locator('#result-6')).toHaveText('Correct: deeply nested');
});

test('7. filter: Buy on the Pro plan', async ({ page }) => {
  await page.locator('.plan').filter({ hasText: 'Pro' }).getByRole('button', { name: 'Buy' }).click();
  await expect(page.locator('#result-7')).toHaveText('Correct: filter');
});

test('9. table: Edit Anu', async ({ page }) => {
  const row = page.getByRole('row').filter({ hasText: 'Anu' });
  await row.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('#result-9')).toHaveText('Correct: table row');
});

test('13. iframe: Pay now', async ({ page }) => {
  const frame = page.frameLocator('#payment-frame');
  await frame.getByRole('button', { name: 'Pay now' }).click();
  await expect(frame.locator('#paid')).toHaveText('Payment done');
});
