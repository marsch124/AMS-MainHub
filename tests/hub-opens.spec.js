/* Test 1 — the hub opens and shows its three tiles.
   Guards: start-up finishing without errors, the three tiles being there, and
   his saved wealth data (kept although the hub no longer shows it) being left
   exactly as it was. */
const { test, expect } = require('@playwright/test');
const { openHub, SEED } = require('./helpers');

test('the hub opens, shows its three tiles and leaves saved data alone', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await openHub(page);

  for(const id of ['tile-retire', 'tile-year', 'tile-versions'])
    await expect(page.getByTestId(id)).toBeVisible();
  await expect(page.locator('#miniRow').getByTestId('tile-retire')).toBeVisible();

  const kept = await page.evaluate(() => ({
    accounts: JSON.parse(localStorage.getItem('amshub.wealth.accounts') || 'null'),
    entries:  JSON.parse(localStorage.getItem('amshub.wealth.entries')  || 'null'),
  }));
  expect(kept.accounts).toEqual(SEED.accounts);
  expect(kept.entries).toEqual(SEED.entries);

  expect(errors, 'the page must start up without errors').toEqual([]);
});

test('with no saved data the hub still opens with its three tiles', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await openHub(page, null);
  for(const id of ['tile-retire', 'tile-year', 'tile-versions'])
    await expect(page.getByTestId(id)).toBeVisible();
  expect(errors).toEqual([]);
});
