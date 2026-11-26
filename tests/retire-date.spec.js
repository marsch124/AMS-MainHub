/* 2.7 — the retirement date is a setting, not code (the code is public).
   Guards: with no date the tile asks for one; a date picked in Settings is saved at once,
   shown on the tile and carried in the backup; a date handed over by local-settings.js is
   taken once. Invented dates only. */
const { test, expect } = require('@playwright/test');
const { openHub } = require('./helpers');

test('no date: the tile asks for one; picking a date in Settings shows it and keeps it', async ({ page }) => {
  await openHub(page);
  await expect(page.getByTestId('tile-body-retire')).toContainText('set your date in Settings');
  await page.locator('#settingsBtn').click();
  await page.getByTestId('retire-date').fill('2031-03-15');
  await page.getByTestId('retire-date').dispatchEvent('change');
  await expect(page.getByTestId('tile-body-retire')).toContainText('15 Mar 2031');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('amshub.look')).retire);
  expect(saved).toBe('2031-03-15');
  const backup = await page.evaluate(() => JSON.parse(localStorage.getItem('amshub.look')));
  expect(backup.retire).toBe('2031-03-15');
});

test('a date from local-settings.js is taken once', async ({ page }) => {
  await page.route('**/local-settings.js', r => r.fulfill({ status:200, contentType:'text/javascript',
    body:"window.HUB_LOCAL = { retire:'2030-09-01' };" }));
  await openHub(page);
  await expect(page.getByTestId('tile-body-retire')).toContainText(/1 Sept? 2030/);
});
