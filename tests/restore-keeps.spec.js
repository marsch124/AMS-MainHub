/* Test 15 — putting data back never throws away what is already here (2.1).
   (2.5: the safety copy's "Put those entries back" and the refused-save test lived in the
   retired wealth window and are gone; the backup restore below is the same rule.)
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
});
