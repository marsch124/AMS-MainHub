/* Test 8 — History marks the month the workbook disagrees with.
   The Wealth tile only ever speaks about the newest month; History is
   where he looks for WHICH month is off. The mark sits under that
   column's TOTAL, in the same amber, and only where the two differ. */
const { test, expect } = require('@playwright/test');
const { openHub } = require('./helpers');

/* July and August agree with his entries (1.00M, 1.10M); September does not (1.25M) */
const series = { ok:true, series:[
  { month:'2026-07', value:1000000 }, { month:'2026-08', value:1100000 }, { month:'2026-09', value:1000000 },
] };

test('History marks only the month that disagrees, in amber', async ({ page }) => {
  await openHub(page, undefined, { engine:{ '/wealth': series } });
  await page.getByTestId('tile-wealth').getByTestId('wealth-pen').click();
  const marks = page.getByTestId('hist-mismatch');
  await expect(marks).toHaveCount(1);
  const sep = page.locator('[data-testid="hist-mismatch"][data-month="2026-09"]');
  await expect(sep).toHaveText('workbook 1M kr');
  await expect(sep).toHaveAttribute('title', /250k kr less/);
  expect(await sep.evaluate(el => getComputedStyle(el).color)).toBe('rgb(180, 104, 15)');
});

test('History stays quiet when the workbook agrees', async ({ page }) => {
  await openHub(page, undefined, { engine:{ '/wealth': { ok:true, series:[{ month:'2026-09', value:1250000 }] } } });
  await page.getByTestId('tile-wealth').getByTestId('wealth-pen').click();
  await expect(page.getByTestId('wtab-history')).toHaveClass(/cur/);
  await expect(page.getByTestId('hist-mismatch')).toHaveCount(0);
});
