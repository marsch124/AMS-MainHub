/* Test 7 — the hub follows the device into night.
   Guards: the dark paper, every tile keeping its OWN colour by night (mixed
   into the dark, not left pale), the main button staying full colour, and the
   hub switching while open. */
const { test, expect } = require('@playwright/test');
const { openHub } = require('./helpers');

const bg = (loc) => loc.evaluate(el => getComputedStyle(el).backgroundColor);
/* a tile caught mid-redraw has no colour at all ("") — count it as not dark yet, so a poll tries again */
const light = (rgb) => { const m = rgb.match(/\d+/g); if(!m) return 1; const [r, g, b] = m.map(Number); return (r * .299 + g * .587 + b * .114) / 255; };

test('by day the hub keeps its pale tints', async ({ page }) => {
  await page.emulateMedia({ colorScheme:'light' });
  await openHub(page);
  expect(await bg(page.locator('html'))).toBe('rgb(250, 241, 226)');
  expect(await bg(page.getByTestId('tile-wealth'))).toBe('rgb(250, 238, 203)');
});

test('by night the paper is dark and every tile keeps its own colour', async ({ page }) => {
  await page.emulateMedia({ colorScheme:'dark' });
  await openHub(page);
  expect(await bg(page.locator('html'))).toBe('rgb(27, 24, 21)');

  const wealth = await bg(page.getByTestId('tile-wealth'));
  const year = await bg(page.getByTestId('tile-year'));
  expect(light(wealth)).toBeLessThan(0.35);
  expect(light(year)).toBeLessThan(0.35);
  expect(wealth).not.toBe(year);   /* still two different colours */

  /* the main button: full colour, white words */
  await page.getByTestId('tile-wealth').getByTestId('wealth-pen').click();
  await page.getByTestId('wtab-entry').click();
  const save = page.getByTestId('entry-save');
  expect(await bg(save)).toBe('rgb(236, 138, 100)');
});

test('switching to night while open redraws the tiles', async ({ page }) => {
  await page.emulateMedia({ colorScheme:'light' });
  await openHub(page);
  await page.emulateMedia({ colorScheme:'dark' });
  await expect.poll(async () => light(await bg(page.getByTestId('tile-wealth')))).toBeLessThan(0.35);
});
