/* Test 4 — typing a new wealth entry and pressing Save keeps it.
   Guards the whole New entry path: the thousands rule (900 → 900 000),
   the running total, Save storing the entry, the tile showing the new
   total and History gaining the new column. */
const { test, expect } = require('@playwright/test');
const { openHub } = require('./helpers');

test('a typed entry is saved, totalled and shown on the tile and in History', async ({ page }) => {
  await openHub(page);
  const sheet = page.getByTestId('wealth-sheet');

  await page.getByTestId('tile-wealth').getByTestId('wealth-pen').click();
  await sheet.getByTestId('wtab-entry').click();

  await sheet.getByTestId('entry-date').fill('2026-10-01');
  await sheet.getByTestId('entry-a1').fill('900');
  await sheet.getByTestId('entry-a2').fill('500');
  await expect(sheet.getByTestId('entry-total')).toHaveText('1 400 000 kr');

  await sheet.getByTestId('entry-save').click();
  await expect(sheet).not.toHaveClass(/show/);

  /* stored on this device, exactly as typed */
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('amshub.wealth.entries')));
  expect(stored['2026-10-01'].v).toEqual({ a1:900000, a2:500000 });

  /* the tile now leads with the new total */
  await expect(page.getByTestId('tile-wealth').getByTestId('wealth-total')).toHaveText('1.40M kr');

  /* and History has it as the newest column, with its total */
  await page.getByTestId('tile-wealth').getByTestId('wealth-pen').click();
  await expect(sheet.getByTestId('wealth-body')).toContainText('2026-10-01');
  await expect(sheet.getByTestId('wealth-body')).toContainText('1 400 000');
});
