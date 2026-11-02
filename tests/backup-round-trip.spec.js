/* Test 3 — the backup file really contains his data, and really brings it back.

   This is the one failure that would cost him something he cannot retype: a
   backup button that says "saved" while writing a file with nothing in it.
   (That has happened before, in another app: a blind export wrote an empty
   snapshot over a good one.) So this test does not trust the button's words —
   it saves a real file, reads it, wipes the hub, and restores from that file. */
const { test, expect } = require('@playwright/test');
const { openHub, SEED } = require('./helpers');

/* Saving goes three different ways (Apple's Save window on the Mac, the share
   sheet on a phone, a plain download anywhere else). A test browser is the
   third kind, so this one runs at Mac size only. */
test.describe('the backup file', () => {
  test('contains his data, and restoring it brings everything back', async ({ page, browser }, info) => {
    test.skip(info.project.name !== 'mac',
      'the download path only exists on a desktop browser');
    await openHub(page);   /* seeded with two accounts, three entries and one link */

    /* --- save a backup file, the way he does --- */
    await page.getByTestId('settings-btn').click();
    await expect(page.getByTestId('settings-sheet')).toHaveClass(/show/);
    await page.getByTestId('fold-data').evaluate(d => { d.open = true; });

    const download = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('backup-save').click(),
    ]).then(([d]) => d);

    const file = info.outputPath('backup.json');
    await download.saveAs(file);
    const saved = JSON.parse(require('fs').readFileSync(file, 'utf8'));

    /* --- the file must actually hold the data, not just exist --- */
    expect(saved.wealthAccounts.map(a => a.name)).toEqual(SEED.accounts.map(a => a.name));
    expect(Object.keys(saved.wealthEntries).sort()).toEqual(Object.keys(SEED.entries).sort());
    expect(saved.wealthEntries['2026-09-01'].v).toEqual(SEED.entries['2026-09-01'].v);
    expect(JSON.stringify(saved.links)).toContain('Anna recipes');
    expect(require('fs').statSync(file).size).toBeGreaterThan(200);

    /* --- now restore it into a SECOND, EMPTY hub --- */
    /* a fresh browser is a fresh device: this is exactly how he carries his
       entries from the iPhone to the Mac, and it proves the file stands on its
       own rather than the first hub still remembering something */
    const other = await browser.newContext();
    const page2 = await other.newPage();
    await openHub(page2, null);                       /* nothing saved at all */
    const total2 = page2.getByTestId('tile-wealth').getByTestId('wealth-total');
    await expect(total2).toHaveAttribute('data-have', 'no');   /* really empty */

    page2.once('dialog', d => d.accept());   /* the restore asks before replacing */
    await page2.getByTestId('settings-btn').click();
    await page2.getByTestId('fold-data').evaluate(d => { d.open = true; });
    await page2.getByTestId('backup-file').setInputFiles(file);

    /* --- everything is back on the new device --- */
    await expect(total2).toHaveAttribute('data-have', 'yes', { timeout: 10000 });
    await expect(total2).toContainText('1.25M');
    const back = await page2.evaluate(() => ({
      accounts: JSON.parse(localStorage.getItem('amshub.wealth.accounts') || '[]').map(a => a.name),
      entries: Object.keys(JSON.parse(localStorage.getItem('amshub.wealth.entries') || '{}')).sort(),
      links: localStorage.getItem('amshub.v1') || '',
    }));
    expect(back.accounts).toEqual(SEED.accounts.map(a => a.name));
    expect(back.entries).toEqual(Object.keys(SEED.entries).sort());
    expect(back.links).toContain('Anna recipes');
    await other.close();
  });
});
