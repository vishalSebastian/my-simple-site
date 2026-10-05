// Sample solutions for the "Learn Locators" page.
// Run the site first (npm run dev), or change BASE to the GitHub Pages URL.
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173/my-simple-site/#/learn-locators';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE);
  await page.locator('#candidate-name').fill('Test Bot');
  await page.locator('#start-practice').click();
});

test('Easy 1: by ID', async ({ page }) => {
  await page.locator('#submit-order').click();
  await expect(page.locator('#result-1')).toHaveText('Correct: ID');
});

test('Easy 2: by class', async ({ page }) => {
  await page.locator('.btn.primary').click();
  await expect(page.locator('#result-2')).toHaveText('Correct: class');
});

test('Medium 3: inside a container', async ({ page }) => {
  await page.locator('#shipping').getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('#result-3')).toHaveText('Correct: container');
});

test('Medium 4: filter cards', async ({ page }) => {
  await page.locator('.plan').filter({ hasText: 'Pro' }).getByRole('button', { name: 'Buy' }).click();
  await expect(page.locator('#result-4')).toHaveText('Correct: filter');
});

test('Hard 5: nested HTML', async ({ page }) => {
  await page.locator('[id="2"] a').click();
  await expect(page.locator('#result-5')).toHaveText('Correct: nested');
});

test('Hard 6: deeply nested', async ({ page }) => {
  await page.locator('#app-shell').getByRole('link', { name: 'Confirm' }).click();
  await expect(page.locator('#result-6')).toHaveText('Correct: deeply nested');
});

test('Locator tester box highlights a correct locator', async ({ page }) => {
  await page.locator('#tester-3').fill('#shipping button');
  await page.locator('#challenge-3').getByRole('button', { name: 'Test' }).click();
  await expect(page.locator('#tester-feedback-3')).toContainText('Correct');
});
