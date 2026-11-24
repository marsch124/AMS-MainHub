/* 2.5 — the money parts are retired from the hub; his stored data is not touched.
   Guards: the six retired tile / pen ids stay gone, the Finance shelf stays gone
   (Sam moved to the Mac shelf), the page never asks the Finance engine again, the
   saved wealth data survives opening the page and still goes into a backup, and a
   tile choice saved by 2.4 does not break start-up. */
const { test, expect } = require('@playwright/test');
const { openHub, SEED } = require('./helpers');
const fs = require('fs');

test('only the three tiles exist, none of the retired tile or pen ids', async ({ page }) => {
  await openHub(page);
  await expect(page.locator('#miniRow [data-testid^="tile-"]:not([data-testid^="tile-body-"])')).toHaveCount(3);
  for(const id of ['tile-retire', 'tile-year', 'tile-versions'])
    await expect(page.locator('#miniRow').getByTestId(id)).toHaveCount(1);
  for(const id of ['tile-wealth', 'tile-wealth0', 'tile-finmonth', 'wealth-pen', 'pen-dot', 'wealth-total'])
    await expect(page.getByTestId(id)).toHaveCount(0);
  await expect(page.locator('#miniEdit')).toHaveCount(0);
});

test('no Finance shelf and none of its cards; Sam sits on the Mac shelf', async ({ page }) => {
  await openHub(page);
  await expect(page.locator('#finCards')).toHaveCount(0);
  for(const app of ['finance', 'dashSpend', 'dashBudget', 'report'])
    await expect(page.locator(`[data-app="${app}"]`)).toHaveCount(0);
  await expect(page.locator('#macCards [data-app="sam"]')).toHaveCount(1);
  await expect(page.locator('[data-app="sam"]')).toHaveCount(1);
});

test('the page never asks the Finance engine for wealth, status or links', async ({ page }) => {
  const asked = [];
  page.on('request', r => {
    const u = new URL(r.url());
    if(u.origin === 'http://localhost:7780') asked.push(u.pathname);
  });
  await openHub(page);
  await page.waitForTimeout(1000);
  for(const p of ['/wealth', '/hubstatus', '/hublinks'])
    expect(asked, 'asked the engine for ' + p).not.toContain(p);
  expect(asked, 'no /health either').not.toContain('/health');
});

test('opening leaves the seeded wealth data exactly as it was, and a backup still holds it', async ({ page }, info) => {
  test.skip(info.project.name !== 'mac', 'the download path only exists on a desktop browser');
  await openHub(page);
  const kept = await page.evaluate(() => ({
    accounts: JSON.parse(localStorage.getItem('amshub.wealth.accounts')),
    entries:  JSON.parse(localStorage.getItem('amshub.wealth.entries')),
  }));
  expect(kept.accounts).toEqual(SEED.accounts);
  expect(kept.entries).toEqual(SEED.entries);

  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-data').evaluate(d => { d.open = true; });
  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('backup-save').click(),
  ]).then(([d]) => d);
  const file = info.outputPath('backup.json');
  await download.saveAs(file);
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(Object.keys(saved.wealthEntries).sort()).toEqual(['2026-07-01', '2026-08-01', '2026-09-01']);
  expect(saved.wealthEntries).toEqual(SEED.entries);
});

test('a tile choice saved by 2.4 opens fine: Retirement stays on, Sam is on the Mac shelf', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await openHub(page, { ...SEED, extra:{ 'amshub.look': JSON.stringify({
    order:{ fin:['finance', 'dashSpend', 'dashBudget', 'report', 'sam'], web:[], mac:['timers', 'watchlater'] },
    colors:{},
    tiles:['wealth', 'retire', 'finmonth'],
    tilesKnown:['wealth', 'wealth0', 'retire', 'year', 'finmonth', 'versions'],
  }) } });
  await expect(page.getByTestId('tile-retire')).toBeVisible();
  await expect(page.getByTestId('tile-retire')).not.toHaveClass(/\boff\b/);
  await expect(page.locator('#macCards [data-app="sam"]')).toHaveCount(1);
  await expect(page.locator('#finCards')).toHaveCount(0);
  expect(errors).toEqual([]);
});
