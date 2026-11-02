/* Test 2 — the pen on the Wealth tile opens the wealth window.
   Guards: the pen being connected, the window opening on History (look
   first, then type), and the Close button shutting it again. */
const { test, expect } = require('@playwright/test');
const { openHub } = require('./helpers');

test('the pen opens the wealth window on History, and Close shuts it', async ({ page }) => {
  await openHub(page);

  const sheet = page.getByTestId('wealth-sheet');
  await expect(sheet).not.toHaveClass(/show/);

  await page.getByTestId('tile-wealth').getByTestId('wealth-pen').click();

  await expect(sheet).toHaveClass(/show/);
  await expect(sheet.getByTestId('wealth-body')).toBeVisible();
  /* it opens on History — that is the tab marked as the current one */
  await expect(sheet.getByTestId('wtab-history')).toHaveClass(/cur/);
  await expect(sheet.getByTestId('wtab-entry')).not.toHaveClass(/cur/);

  await sheet.getByTestId('wealth-close').click();
  await expect(sheet).not.toHaveClass(/show/);
});
