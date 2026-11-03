/* Test 10 — the two shortcuts to a month the workbook disagrees with (1.60).
   (1) The Wealth pencil carries an amber dot when ANY month is off, not just
       the newest — so he knows before opening History.
   (2) Tapping an amber mark in History opens that month's entry to correct it. */
const { test, expect } = require('@playwright/test');
const { openHub } = require('./helpers');

/* his entries: July 1.00M, August 1.10M, September 1.25M */
const agree = { month:'2026-08', value:1100000 };
const septOk = { month:'2026-09', value:1250000 };

test('the pencil has an amber dot when an older month disagrees', async ({ page }) => {
  /* September (the newest, the one the tile speaks about) agrees; July does not */
  await openHub(page, undefined, { engine:{ '/wealth': { ok:true, series:[
    { month:'2026-07', value:900000 }, agree, septOk ] } } });
  const pen = page.getByTestId('tile-wealth').getByTestId('wealth-pen');
  const dot = pen.getByTestId('pen-dot');
  await expect(dot).toHaveCount(1);
  await expect(page.getByTestId('wealth-mismatch')).toHaveCount(0);   /* the tile itself stays quiet */
  expect(await dot.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(180, 104, 15)');
  await expect(pen).toHaveAttribute('aria-label', /1 month differs from your workbook/);
});

test('the pencil has no dot when every month agrees', async ({ page }) => {
  await openHub(page, undefined, { engine:{ '/wealth': { ok:true, series:[
    { month:'2026-07', value:1000000 }, agree, septOk ] } } });
  await expect(page.getByTestId('tile-wealth').getByTestId('wealth-pen')).toBeVisible();
  await expect(page.getByTestId('pen-dot')).toHaveCount(0);
});

test('tapping an amber mark in History opens that month to correct it', async ({ page }) => {
  await openHub(page, undefined, { engine:{ '/wealth': { ok:true, series:[
    { month:'2026-07', value:900000 }, agree, septOk ] } } });
  await page.getByTestId('tile-wealth').getByTestId('wealth-pen').click();
  /* July is the oldest column — on the iPhone it lives in Earlier entries, so take the visible one */
  await page.locator('[data-testid="hist-mismatch"][data-month="2026-07"]:visible').click();
  await expect(page.getByTestId('wtab-entry')).toHaveClass(/cur/);
  await expect(page.getByTestId('entry-date')).toHaveValue('2026-07-01');
  await expect(page.getByTestId('entry-a1')).toHaveValue('600 000');
});
