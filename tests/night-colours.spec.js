/* Test 7 — the hub follows the device into night.
   Guards: the dark paper, every tile keeping its OWN colour by night (mixed
   into the dark, not left pale), the main button staying full colour, and the
   hub switching while open. */
const { test, expect } = require('@playwright/test');
const { openHub, SEED } = require('./helpers');

const bg = (loc) => loc.evaluate(el => getComputedStyle(el).backgroundColor);
/* a tile caught mid-redraw has no colour at all ("") — count it as not dark yet, so a poll tries again */
const light = (rgb) => { const m = rgb.match(/\d+/g); if(!m) return 1; const [r, g, b] = m.map(Number); return (r * .299 + g * .587 + b * .114) / 255; };

test('by day the hub keeps its pale tints', async ({ page }) => {
  await page.emulateMedia({ colorScheme:'light' });
  await openHub(page);
  expect(await bg(page.locator('html'))).toBe('rgb(250, 241, 226)');
  expect(light(await bg(page.getByTestId('tile-retire')))).toBeGreaterThan(0.6);
  expect(light(await bg(page.getByTestId('tile-year')))).toBeGreaterThan(0.6);
});

test('by night the paper is dark and every tile keeps its own colour', async ({ page }) => {
  await page.emulateMedia({ colorScheme:'dark' });
  /* connected to a Dropbox that is not there, so the main button (Sync now) is on show */
  await page.route(/dropboxapi\.com/, r => r.fulfill({ status:409, headers:{ 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'*' }, body:'{"error_summary":"path/not_found/"}' }));
  await openHub(page, { ...SEED, extra:{ 'amshub.dropbox': JSON.stringify({ refresh:'RT', access:'AT', exp: Date.now() + 3600e3 }) } });
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-sync').locator('summary').click();
  expect(await bg(page.locator('html'))).toBe('rgb(27, 24, 21)');

  const retire = await bg(page.getByTestId('tile-retire'));
  const year = await bg(page.getByTestId('tile-year'));
  const versions = await bg(page.getByTestId('tile-versions'));
  for(const c of [retire, year, versions]) expect(light(c)).toBeLessThan(0.35);
  expect(new Set([retire, year, versions]).size).toBe(3);   /* still three different colours */

  /* the main button (Sync now): full colour, not grey, not pale */
  const rgb = (await bg(page.getByTestId('sync-now'))).match(/\d+/g).map(Number);
  expect(Math.max(...rgb) - Math.min(...rgb)).toBeGreaterThan(60);
  expect(light(await bg(page.getByTestId('sync-now')))).toBeLessThan(0.8);
});

test('switching to night while open redraws the tiles', async ({ page }) => {
  await page.emulateMedia({ colorScheme:'light' });
  await openHub(page);
  await page.emulateMedia({ colorScheme:'dark' });
  await expect.poll(async () => light(await bg(page.getByTestId('tile-retire')))).toBeLessThan(0.35);
});
