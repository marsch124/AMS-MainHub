/* Test 9 — Day / Night / Automatic in Settings.
   Automatic (the default) follows the device; Day and Night hold whatever
   the device does, take effect at once, and are remembered. */
const { test, expect } = require('@playwright/test');
const { openHub, SEED } = require('./helpers');

const paper = page => page.locator('html').evaluate(el => getComputedStyle(el).backgroundColor);
const DAY = 'rgb(250, 241, 226)', NIGHT = 'rgb(27, 24, 21)';

test('Automatic is the default and follows the device', async ({ page }) => {
  await page.emulateMedia({ colorScheme:'dark' });
  await openHub(page);
  await page.getByTestId('settings-btn').click();
  await expect(page.getByTestId('look-auto')).toHaveClass(/cur/);
  expect(await paper(page)).toBe(NIGHT);
});

test('Night holds by day, Day holds by night, and the choice is kept', async ({ page }) => {
  await page.emulateMedia({ colorScheme:'light' });
  await openHub(page);
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('look-night').click();
  await expect(page.getByTestId('look-night')).toHaveClass(/cur/);
  expect(await paper(page)).toBe(NIGHT);
  expect(await page.evaluate(() => localStorage.getItem('amshub.theme'))).toBe('night');

  await page.emulateMedia({ colorScheme:'dark' });
  await page.getByTestId('look-day').click();
  expect(await paper(page)).toBe(DAY);
  /* the tiles follow the choice, not the device */
  const tile = await page.getByTestId('tile-retire').evaluate(el => getComputedStyle(el).backgroundColor.match(/\d+/g).map(Number));
  expect((tile[0] * .299 + tile[1] * .587 + tile[2] * .114) / 255).toBeGreaterThan(0.6);   /* pale, though the device is dark */

  await page.getByTestId('look-auto').click();
  expect(await paper(page)).toBe(NIGHT);
});

test('a saved Night choice is there from the start', async ({ page }) => {
  await page.emulateMedia({ colorScheme:'light' });
  await openHub(page, { ...SEED, theme:'night' });
  expect(await paper(page)).toBe(NIGHT);
});
