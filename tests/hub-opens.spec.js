/* Test 1 — the hub opens, and the Wealth tile shows the newest total.
   Guards: start-up finishing, the saved wealth data being read, and the
   total on the tile being the newest entry (not an older one, not blank). */
const { test, expect } = require('@playwright/test');
const { openHub, NEWEST_TOTAL_M } = require('./helpers');

test('the hub opens and the Wealth tile shows the newest total', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await openHub(page);

  const tile  = page.getByTestId('tile-wealth');
  const total = tile.getByTestId('wealth-total');

  await expect(tile).toBeVisible();
  await expect(total).toBeVisible();
  /* it must have real data behind it, not the "—" stand-in */
  await expect(total).toHaveAttribute('data-have', 'yes');
  await expect(total).toContainText(NEWEST_TOTAL_M);
  /* and the pen must be there to open the sheet with */
  await expect(tile.getByTestId('wealth-pen')).toBeVisible();

  expect(errors, 'the page must start up without errors').toEqual([]);
});

test('with no saved data the tile says so instead of showing a number', async ({ page }) => {
  await openHub(page, null);
  const total = page.getByTestId('tile-wealth').getByTestId('wealth-total');
  await expect(total).toHaveAttribute('data-have', 'no');
});
