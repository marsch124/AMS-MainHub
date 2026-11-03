/* Test 15 — putting data back never throws away what is already here (2.1).
   Before 2.1 a restore REPLACED this device's wealth with the backup's, so
   entries newer than the backup were dropped — and with Dropbox sync on, that
   drop travelled to the other device as a deletion. The same went for the
   safety copy's "Put those entries back". Now both only add what is missing. */
const { test, expect } = require('@playwright/test');
const { openHub, SEED } = require('./helpers');
const fs = require('fs'), path = require('path'), os = require('os');

const stored = (page, key) => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), key);

test('restoring an older backup keeps the newer entries and deletes nothing', async ({ page }) => {
  await openHub(page, { ...SEED, entries:{ ...SEED.entries,
    '2026-10-01':{ v:{ a1:900000, a2:500000 }, c:[] } } });
  /* the backup knows only July and August, and a different September than none */
  const file = path.join(os.tmpdir(), 'hub-old-backup-' + Date.now() + '.json');
  fs.writeFileSync(file, JSON.stringify({ app:'AMS Main Hub', links:SEED.links, wealthAccounts:SEED.accounts,
    wealthEntries:{ '2026-07-01':SEED.entries['2026-07-01'], '2026-08-01':SEED.entries['2026-08-01'] },
    wealthSnaps:[{ day:'2026-08-02', n:2, accounts:SEED.accounts, entries:{} }] }));
  page.on('dialog', d => d.accept());
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-data').evaluate(d => { d.open = true; });
  await page.getByTestId('backup-file').setInputFiles(file);
  await expect.poll(async () => Object.keys(await stored(page, 'amshub.wealth.entries') || {}).sort().join())
    .toBe('2026-07-01,2026-08-01,2026-09-01,2026-10-01');
  expect(await stored(page, 'amshub.wealth.deleted') || {}).toEqual({});
  /* this device's own safety copies are kept alongside the backup's */
  const days = (await stored(page, 'amshub.wealth.snaps')).map(s => s.day);
  expect(days).toContain('2026-08-02');
  expect(days.length).toBeGreaterThan(1);
  await expect(page.getByTestId('tile-wealth').getByTestId('wealth-total')).toHaveText('1.40M kr');
});

test('"Put those entries back" adds the missing ones and keeps the newer ones', async ({ page }) => {
  await openHub(page, { accounts:SEED.accounts, entries:{ '2026-10-01':{ v:{ a1:900000, a2:500000 }, c:[] } },
    extra:{ 'amshub.wealth.snaps':JSON.stringify([{ day:'2026-09-02', n:3, accounts:SEED.accounts, entries:SEED.entries }]) } });
  page.on('dialog', d => d.accept());
  await page.getByTestId('tile-wealth').getByTestId('wealth-pen').click();
  await page.locator('#wRestoreSnap').click();
  await expect.poll(async () => Object.keys(await stored(page, 'amshub.wealth.entries') || {}).sort().join())
    .toBe('2026-07-01,2026-08-01,2026-09-01,2026-10-01');
  expect(await stored(page, 'amshub.wealth.deleted') || {}).toEqual({});
});

test('a save this device refuses to store is said out loud', async ({ page }) => {
  await openHub(page);
  await page.evaluate(() => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v){
      if(k === 'amshub.wealth.entries') throw new DOMException('full', 'QuotaExceededError');
      return real.call(this, k, v);
    };
  });
  const said = [];
  page.on('dialog', d => { said.push(d.message()); d.accept(); });
  await page.getByTestId('tile-wealth').getByTestId('wealth-pen').click();
  await page.getByTestId('wtab-entry').click();
  await page.getByTestId('entry-date').fill('2026-10-01');
  await page.getByTestId('entry-a1').fill('900');
  await page.getByTestId('entry-a2').fill('500');
  await page.getByTestId('entry-save').click();
  await expect.poll(() => said.join(' | ')).toContain('could not keep');
});
