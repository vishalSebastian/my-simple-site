// Starter template for the Playwright Challenges.
// Write the steps yourself; answers are not in this repo.
import { test, expect } from '@playwright/test';

const BASE = 'https://vishalsebastian.github.io/my-simple-site/#/challenges';
const NAME = 'Shinu';

test('01: click the right button', async ({ page }) => {
  await page.goto(`${BASE}/01?name=${NAME}`);

  // your steps here

  await expect(page.getByTestId('success-code')).toContainText('PW-01-');
});
