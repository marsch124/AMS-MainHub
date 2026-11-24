/* 2.6 — two cards that lead to real apps rather than web pages.
   Steward has no address a web page can open, so its card says where to find it;
   Packing's old web page is gone, so its card opens the app itself. */
const { test, expect } = require('@playwright/test');
const { openHub } = require('./helpers');

test('the Steward card sits on the Mac shelf and a tap says where to find the app', async ({ page }) => {
  await openHub(page);
  const card = page.locator('#macCards [data-app="steward"]');
  await expect(card).toHaveCount(1);
  await expect(card).toHaveAttribute('data-note', /own icon/);
  await expect(page.getByTestId('toast')).toBeHidden();
  await card.click();
  await expect(page.getByTestId('toast')).toBeVisible();
  await expect(page.getByTestId('toast')).toContainText('Finance Steward');
});

test('the Packing card opens the app itself and the old web page is never asked', async ({ page }) => {
  const asked = [];
  page.on('request', r => { if(/AMS-Packing\//.test(r.url())) asked.push(r.url()); });
  await openHub(page);
  const card = page.locator('#webCards [data-app="packing"]');
  await expect(card).toHaveAttribute('href', 'amspacking://');
  await expect(card).toHaveAttribute('data-native', '1');
  await page.waitForTimeout(800);
  expect(asked).toEqual([]);
});
