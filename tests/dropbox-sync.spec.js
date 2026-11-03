/* Test 14 — Dropbox sync (2.0). A stand-in for Dropbox is played here, so no test
   ever reaches the real Dropbox. It keeps one file with a revision number and
   refuses an upload made against an older revision, exactly as Dropbox does. */
const { test, expect } = require('@playwright/test');
const { openHub } = require('./helpers');

const ACC = [{ id:'a1', name:'ISK', url:'' }, { id:'a2', name:'Avanza', url:'' }];
const CONNECTED = { 'amshub.dropbox': JSON.stringify({ refresh:'RT', access:'AT', exp: Date.now() + 3600e3 }) };

async function fakeDropbox(page, box){
  box.rev = box.rev || 0; box.uploads = 0;
  const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'*',
                 'Access-Control-Expose-Headers':'Dropbox-API-Result' };
  await page.route(/dropboxapi\.com/, async route => {
    const req = route.request(), u = new URL(req.url());
    if(req.method() === 'OPTIONS') return route.fulfill({ status:204, headers:cors });
    if(u.pathname === '/oauth2/token')
      return route.fulfill({ status:200, headers:cors, contentType:'application/json',
        body:JSON.stringify({ access_token:'AT', refresh_token:'RT', expires_in:14400 }) });
    if(u.pathname === '/2/files/download'){
      if(!box.file) return route.fulfill({ status:409, headers:cors, body:'{"error_summary":"path/not_found/"}' });
      const out = { status:200, headers:{ ...cors, 'Dropbox-API-Result':JSON.stringify({ rev:'r' + box.rev }) },
                    contentType:'application/json', body:JSON.stringify(box.file) };
      /* another device writes right after this one read: its upload must be refused */
      if(box.interfere){ const f = box.interfere; box.interfere = null; box.file = f(box.file); box.rev++; }
      return route.fulfill(out);
    }
    if(u.pathname === '/2/files/upload'){
      const arg = JSON.parse(req.headers()['dropbox-api-arg']);
      const stale = arg.mode['.tag'] === 'update' ? arg.mode.update !== 'r' + box.rev : !!box.file;
      if(stale) return route.fulfill({ status:409, headers:cors, body:'{"error_summary":"path/conflict/file/"}' });
      box.file = JSON.parse(req.postData()); box.rev++; box.uploads++;
      return route.fulfill({ status:200, headers:cors, contentType:'application/json', body:JSON.stringify({ rev:'r' + box.rev }) });
    }
    return route.fulfill({ status:404, headers:cors, body:'' });
  });
}
const localEntries = page => page.evaluate(() => JSON.parse(localStorage.getItem('amshub.wealth.entries') || '{}'));

test('connecting: Dropbox opens, the pasted code connects, and this device\'s entries go up', async ({ page }) => {
  const box = {};
  await page.addInitScript(() => { window.open = u => { window.__opened = u; return null; }; });
  await openHub(page);
  await fakeDropbox(page, box);
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-sync').locator('summary').click();
  await page.getByTestId('sync-connect').click();
  await expect.poll(() => page.evaluate(() => window.__opened || '')).toContain('code_challenge=');
  await page.getByTestId('sync-code').fill('THE-CODE');
  await page.getByTestId('sync-finish').click();
  await expect(page.getByTestId('sync-status')).toContainText('Connected');
  expect(Object.keys(box.file.entries).sort()).toEqual(['2026-07-01', '2026-08-01', '2026-09-01']);
  expect(box.file.accounts.map(a => a.id)).toEqual(['a1', 'a2']);
});

test('merging: the newer change wins entry by entry, a deletion travels, nothing is lost', async ({ page }) => {
  const box = { rev:1, file:{ accounts:ACC,
    entries:{ '2026-08-01':{ v:{ a1:999000, a2:1000 }, c:[], at:'2026-10-06T10:00:00.000Z' },
              '2026-10-01':{ v:{ a1:700000, a2:500000 }, c:[], at:'2026-10-02T10:00:00.000Z' } },
    deleted:{ '2026-07-01':'2026-10-05T10:00:00.000Z' } } };
  await fakeDropbox(page, box);
  await openHub(page, { accounts:ACC, extra:CONNECTED, entries:{
    '2026-07-01':{ v:{ a1:600000, a2:400000 }, c:[], at:'2026-10-01T10:00:00.000Z' },
    '2026-08-01':{ v:{ a1:700000, a2:400000 }, c:[], at:'2026-10-01T10:00:00.000Z' },
    '2026-09-01':{ v:{ a1:800000, a2:450000 }, c:[], at:'2026-10-01T10:00:00.000Z' } } });
  await expect.poll(async () => Object.keys(await localEntries(page)).sort().join()).toBe('2026-08-01,2026-09-01,2026-10-01');
  expect((await localEntries(page))['2026-08-01'].v.a1).toBe(999000);
  await expect.poll(() => Object.keys(box.file.entries).sort().join()).toBe('2026-08-01,2026-09-01,2026-10-01');
  expect(box.file.deleted['2026-07-01']).toBeTruthy();
  await expect(page.getByTestId('tile-wealth').getByTestId('wealth-total')).toHaveText('1.20M kr');
});

test('a saved entry goes up, even when another device wrote in between', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-10T09:00:00'));
  const box = {};
  await fakeDropbox(page, box);
  await openHub(page, { accounts:ACC, extra:CONNECTED, entries:{ '2026-10-01':{ v:{ a1:500000, a2:500000 }, c:[] } } });
  await expect.poll(() => box.file ? Object.keys(box.file.entries).join() : '').toBe('2026-10-01');
  /* the iPhone saves 1 Sep while this device is busy saving 10 Nov */
  box.interfere = f => ({ ...f, entries:{ ...f.entries, '2026-09-01':{ v:{ a1:400000, a2:400000 }, c:[], at:'2026-11-10T08:00:00.000Z' } } });
  await page.getByTestId('wealth-pen').click();
  await page.getByTestId('wtab-entry').click();
  await page.getByTestId('entry-a1').fill('520');
  await page.getByTestId('entry-a2').fill('500');
  await page.getByTestId('entry-save').click();
  await expect.poll(() => Object.keys(box.file.entries).sort().join(), { timeout:10000 }).toBe('2026-09-01,2026-10-01,2026-11-10');
  await expect.poll(async () => Object.keys(await localEntries(page)).sort().join()).toBe('2026-09-01,2026-10-01,2026-11-10');
});
