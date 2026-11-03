/* Test 12 — this year's growth and the monthly reminder on the Wealth tile (1.62).
   (1) The tile compares the newest entry with the first entry of this year —
       or, with nothing else this year, the last entry before 1 January.
   (2) From the 8th, a month without an entry is named on the tile; tapping it
       opens New entry, and saving an entry for that month makes it go away. */
const { test, expect } = require('@playwright/test');
const { openHub } = require('./helpers');

const ACC = [{ id:'a1', name:'ISK', url:'' }, { id:'a2', name:'Snabbspar', url:'' }];
const e = (a1, a2) => ({ v:{ a1, a2 }, c:[] });

test('growth is measured from the first entry of this year', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-03T09:00:00'));
  /* Dec 1.00M (ignored) · Feb 1.00M (the start) · Oct 1.12M → +12% since Feb */
  await openHub(page, { accounts:ACC, entries:{
    '2025-12-31': e(500000, 500000), '2026-02-28': e(600000, 400000), '2026-10-31': e(700000, 420000) } });
  await expect(page.getByTestId('tile-wealth').getByTestId('wealth-growth')).toHaveText('+12% since Feb');
});

test('with only one entry this year, growth is measured from before 1 January', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-03T09:00:00'));
  /* Dec 1.00M · Oct 0.95M → −5% since Jan */
  await openHub(page, { accounts:ACC, entries:{
    '2025-12-31': e(500000, 500000), '2026-10-31': e(500000, 450000) } });
  await expect(page.getByTestId('tile-wealth').getByTestId('wealth-growth')).toHaveText('−5% since Jan');
});

test('no reminder before the 8th', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-07T09:00:00'));
  await openHub(page, { accounts:ACC, entries:{ '2026-10-31': e(500000, 500000) } });
  await expect(page.getByTestId('tile-wealth').getByTestId('wealth-total')).toBeVisible();
  await expect(page.getByTestId('wealth-reminder')).toHaveCount(0);
});

test('from the 8th the missing month is named; tapping opens New entry; saving clears it', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-10T09:00:00'));
  await openHub(page, { accounts:ACC, entries:{ '2026-10-31': e(500000, 500000) } });
  const r = page.getByTestId('tile-wealth').getByTestId('wealth-reminder');
  await expect(r).toHaveText('Nov not entered yet');
  await r.click();
  await expect(page.getByTestId('wtab-entry')).toHaveClass(/cur/);
  await expect(page.getByTestId('entry-date')).toHaveValue('2026-11-10');
  await page.getByTestId('entry-a1').fill('520');
  await page.getByTestId('entry-a2').fill('500');
  await page.getByTestId('entry-save').click();
  await expect(page.getByTestId('wealth-reminder')).toHaveCount(0);
});
