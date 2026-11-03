/* Test 6 — when the workbook disagrees with his own newest entry, the
   Wealth tile says so in amber (how far apart is in its tip). When they
   agree, it says nothing. (3 Nov 2026: a renamed column made the workbook
   read 4.43M against 7.76M, and nothing flagged it.) */
const { test, expect } = require('@playwright/test');
const { openHub } = require('./helpers');

const series = v => ({ ok:true, series:[{ month:'2026-08', value:1100000 }, { month:'2026-09', value:v }] });

test('a workbook that disagrees is flagged on the Wealth tile', async ({ page }) => {
  await openHub(page, undefined, { engine:{ '/wealth': series(1000000) } });
  const warn = page.getByTestId('tile-wealth').getByTestId('wealth-mismatch');
  await expect(warn).toHaveText('workbook 1M kr');
  await expect(warn).toHaveAttribute('title', /250k kr less/);
  /* amber, not the quiet grey of the line above it */
  const colour = await warn.evaluate(el => getComputedStyle(el).color);
  expect(colour).toBe('rgb(180, 104, 15)');
});

test('a workbook that agrees stays quiet', async ({ page }) => {
  await openHub(page, undefined, { engine:{ '/wealth': series(1250000) } });
  await expect(page.getByTestId('tile-wealth').getByTestId('wealth-total')).toHaveText('1.25M kr');
  await expect(page.getByTestId('wealth-mismatch')).toHaveCount(0);
});
