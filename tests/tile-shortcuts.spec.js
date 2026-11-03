/* Test 11 — the Wealth tile's own shortcuts (1.61).
   (1) Tapping the tile's amber "workbook …" line opens that month's entry.
   (2) The pencil's amber dot carries the number of months that are off. */
const { test, expect } = require('@playwright/test');
const { openHub } = require('./helpers');

/* his entries: July 1.00M, August 1.10M, September 1.25M */
test('tapping the tile\'s amber line opens that month to correct it', async ({ page }) => {
  await openHub(page, undefined, { engine:{ '/wealth': { ok:true, series:[
    { month:'2026-07', value:1000000 }, { month:'2026-08', value:1100000 }, { month:'2026-09', value:1200000 } ] } } });
  await page.getByTestId('tile-wealth').getByTestId('wealth-mismatch').click();
  await expect(page.getByTestId('wtab-entry')).toHaveClass(/cur/);
  await expect(page.getByTestId('entry-date')).toHaveValue('2026-09-01');
  await expect(page.getByTestId('entry-a1')).toHaveValue('800 000');
});

test('the pencil\'s dot says how many months are off', async ({ page }) => {
  await openHub(page, undefined, { engine:{ '/wealth': { ok:true, series:[
    { month:'2026-07', value:900000 }, { month:'2026-08', value:1000000 }, { month:'2026-09', value:1250000 } ] } } });
  const dot = page.getByTestId('tile-wealth').getByTestId('pen-dot');
  await expect(dot).toHaveText('2');
  await expect(dot).toBeVisible();
});
