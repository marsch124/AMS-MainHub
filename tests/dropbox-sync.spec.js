/* Test 14 — Dropbox sync (2.0). A stand-in for Dropbox is played here, so no test
   ever reaches the real Dropbox. It keeps one file with a revision number and
   refuses an upload made against an older revision, exactly as Dropbox does. */
const { test, expect } = require('@playwright/test');
const { openHub } = require('./helpers');

const ACC = [{ id:'a1', name:'ISK', url:'' }, { id:'a2', name:'Avanza', url:'' }];
const CONNECTED = { 'amshub.dropbox': JSON.stringify({ refresh:'RT', access:'AT', exp: Date.now() + 3600e3 }) };

async function fakeDropbox(page, box){
  box.rev = box.rev || 0; box.uploads = 0; box.downloads = 0;
  /* the /backups folder: path -> file text; names listed in box.oldBackups start out there */
  box.backups = {}; box.deleted = [];
  (box.oldBackups || []).forEach(n => { box.backups['/backups/' + n] = '{}'; });
  const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'*',
                 'Access-Control-Expose-Headers':'Dropbox-API-Result' };
  await page.route(/dropboxapi\.com/, async route => {
    const req = route.request(), u = new URL(req.url());
    if(req.method() === 'OPTIONS') return route.fulfill({ status:204, headers:cors });
    if(u.pathname === '/oauth2/token')
      return route.fulfill({ status:200, headers:cors, contentType:'application/json',
        body:JSON.stringify({ access_token:'AT', refresh_token:'RT', expires_in:14400 }) });
    if(u.pathname === '/2/files/list_folder'){
      const entries = Object.keys(box.backups).map(p => ({ '.tag':'file', name:p.split('/').pop(), path_lower:p.toLowerCase() }));
      return route.fulfill({ status:200, headers:cors, contentType:'application/json', body:JSON.stringify({ entries, has_more:false, cursor:'c' }) });
    }
    if(u.pathname === '/2/files/delete_v2'){
      const p = JSON.parse(req.postData()).path;
      box.deleted.push(p); delete box.backups[p];
      return route.fulfill({ status:200, headers:cors, contentType:'application/json', body:'{"metadata":{}}' });
    }
    if(u.pathname === '/2/files/download'){
      const want = JSON.parse(req.headers()['dropbox-api-arg']).path;
      if(want.startsWith('/backups/')){
        if(!box.backups[want]) return route.fulfill({ status:409, headers:cors, body:'{"error_summary":"path/not_found/"}' });
        return route.fulfill({ status:200, headers:cors, contentType:'application/json', body:box.backups[want] });
      }
      box.downloads++;
      if(!box.file) return route.fulfill({ status:409, headers:cors, body:'{"error_summary":"path/not_found/"}' });
      const out = { status:200, headers:{ ...cors, 'Dropbox-API-Result':JSON.stringify({ rev:'r' + box.rev }) },
                    contentType:'application/json', body:JSON.stringify(box.file) };
      /* another device writes right after this one read: its upload must be refused */
      if(box.interfere){ const f = box.interfere; box.interfere = null; box.file = f(box.file); box.rev++; }
      return route.fulfill(out);
    }
    if(u.pathname === '/2/files/upload'){
      const arg = JSON.parse(req.headers()['dropbox-api-arg']);
      if(arg.path !== '/wealth.json'){
        if(box.failBackup) return route.fulfill({ status:409, headers:cors, body:'{"error_summary":"path/insufficient_space/.."}' });
        box.backups[arg.path] = req.postData();
        return route.fulfill({ status:200, headers:cors, contentType:'application/json', body:'{"rev":"b1"}' });
      }
      const stale = arg.mode['.tag'] === 'update' ? arg.mode.update !== 'r' + box.rev : !!box.file;
      if(stale) return route.fulfill({ status:409, headers:cors, body:'{"error_summary":"path/conflict/file/"}' });
      box.file = JSON.parse(req.postData()); box.rev++; box.uploads++;
      return route.fulfill({ status:200, headers:cors, contentType:'application/json', body:JSON.stringify({ rev:'r' + box.rev }) });
    }
    return route.fulfill({ status:404, headers:cors, body:'' });
  });
}
/* 2.1.3: Connect is a plain link to Dropbox, ready before the tap — the iPhone blocks a
   page opened after a pause. Tap it here without following it, and hand back where it points. */
async function tapConnect(page){
  const link = page.getByTestId('sync-connect');
  await expect(link).toHaveAttribute('href', /code_challenge=/);
  await expect(link).toHaveAttribute('target', '_blank');
  return page.evaluate(() => {
    const a = document.querySelector('[data-testid="sync-connect"]');
    a.addEventListener('click', e => e.preventDefault());
    a.click();
    return a.href;
  });
}
const localEntries = page => page.evaluate(() => JSON.parse(localStorage.getItem('amshub.wealth.entries') || '{}'));

test('connecting: Dropbox opens, the pasted code connects, and this device\'s entries go up', async ({ page }) => {
  const box = {};
  await openHub(page);
  await fakeDropbox(page, box);
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-sync').locator('summary').click();
  expect(await tapConnect(page)).toContain('client_id=');
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

/* 2.0.1 — when Dropbox refuses the file, the hub says so and never claims it synced */
test('a refused upload shows Dropbox\'s reason, not "last synced"', async ({ page }) => {
  await page.route(/dropboxapi\.com/, route => {
    const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'*' }, u = route.request().url();
    if(route.request().method() === 'OPTIONS') return route.fulfill({ status:204, headers:cors });
    if(u.includes('download')) return route.fulfill({ status:409, headers:cors, body:'{"error_summary":"path/not_found/"}' });
    return route.fulfill({ status:409, headers:cors, body:'{"error_summary":"path/insufficient_space/.."}' });
  });
  await openHub(page, { accounts:ACC, extra:CONNECTED, entries:{ '2026-10-01':{ v:{ a1:500000, a2:500000 }, c:[] } } });
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-sync').locator('summary').click();
  await expect(page.getByTestId('sync-status')).toContainText('insufficient_space');
  await expect(page.getByTestId('sync-status')).not.toContainText('last synced');
});

/* 2.1 — a connection Dropbox no longer accepts asks to connect again */
test('a connection Dropbox has withdrawn says "Connect Dropbox again"', async ({ page }) => {
  await page.route(/dropboxapi\.com/, route => {
    const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'*' };
    if(route.request().method() === 'OPTIONS') return route.fulfill({ status:204, headers:cors });
    return route.fulfill({ status:400, headers:cors, contentType:'application/json', body:'{"error":"invalid_grant","error_description":"refresh token is invalid or revoked"}' });
  });
  await openHub(page, { accounts:ACC, extra:{ 'amshub.dropbox': JSON.stringify({ refresh:'RT', access:'AT', exp: 0 }) },
    entries:{ '2026-10-01':{ v:{ a1:500000, a2:500000 }, c:[] } } });
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-sync').locator('summary').click();
  await expect(page.getByTestId('sync-status')).toContainText('Connect Dropbox again');
});

/* 2.1 — an upload Dropbox does not confirm with a revision is not counted as synced */
test('an unconfirmed upload is not called synced', async ({ page }) => {
  await page.route(/dropboxapi\.com/, route => {
    const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'*' }, u = route.request().url();
    if(route.request().method() === 'OPTIONS') return route.fulfill({ status:204, headers:cors });
    if(u.includes('download')) return route.fulfill({ status:409, headers:cors, body:'{"error_summary":"path/not_found/"}' });
    return route.fulfill({ status:200, headers:cors, contentType:'text/html', body:'<html>sign in</html>' });
  });
  await openHub(page, { accounts:ACC, extra:CONNECTED, entries:{ '2026-10-01':{ v:{ a1:500000, a2:500000 }, c:[] } } });
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-sync').locator('summary').click();
  await expect(page.getByTestId('sync-status')).toContainText('Not synced');
});

/* 2.1 — an entry put back from the safety copy stays, even though Dropbox
   remembers it as deleted: putting it back counts as the newest change */
test('an entry put back is not deleted again by the sync', async ({ page }) => {
  const box = { rev:1, file:{ accounts:ACC, entries:{ '2026-10-01':{ v:{ a1:500000, a2:500000 }, c:[], at:'2026-10-02T10:00:00.000Z' } },
    deleted:{ '2026-07-01':'2026-10-05T10:00:00.000Z', '2026-08-01':'2026-10-05T10:00:00.000Z' } } };
  await fakeDropbox(page, box);
  const old = { '2026-07-01':{ v:{ a1:600000, a2:400000 }, c:[], at:'2026-07-01T10:00:00.000Z' },
                '2026-08-01':{ v:{ a1:700000, a2:400000 }, c:[], at:'2026-08-01T10:00:00.000Z' } };
  await openHub(page, { accounts:ACC, extra:{ ...CONNECTED,
    'amshub.wealth.snaps':JSON.stringify([{ day:'2026-09-02', n:3, accounts:ACC, entries:{ ...old, '2026-10-01':box.file.entries['2026-10-01'] } }]) },
    entries:{ '2026-10-01':box.file.entries['2026-10-01'] } });
  await expect.poll(() => box.uploads).toBeGreaterThanOrEqual(0);
  page.on('dialog', d => d.accept());
  await page.getByTestId('wealth-pen').click();
  await page.locator('#wRestoreSnap').click();
  await expect.poll(() => Object.keys(box.file.entries).sort().join(), { timeout:10000 }).toBe('2026-07-01,2026-08-01,2026-10-01');
  await expect.poll(async () => Object.keys(await localEntries(page)).sort().join()).toBe('2026-07-01,2026-08-01,2026-10-01');
});

/* 2.1.1 — on the iPhone the hub can restart while he is in Dropbox fetching the code;
   coming back, it must still be waiting for that code, not show Connect again */
test('the hub still waits for the code after it restarts', async ({ page, browser }) => {
  await openHub(page);
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-sync').locator('summary').click();
  await tapConnect(page);
  await expect(page.getByTestId('sync-code')).toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem('amshub.dropbox'));
  /* the same device, started afresh, with what was stored */
  const ctx = await browser.newContext({ ...test.info().project.use, serviceWorkers:'block' });
  const p2 = await ctx.newPage();
  await openHub(p2, { accounts:[], entries:{}, extra:{ 'amshub.dropbox': stored } });
  await p2.getByTestId('settings-btn').click();
  await p2.getByTestId('fold-sync').locator('summary').click();
  await expect(p2.getByTestId('sync-code')).toBeVisible();
  await expect(p2.getByTestId('sync-connect')).toHaveCount(0);
  await ctx.close();
});

/* 2.2 — a small mark on the Wealth tile says Dropbox sync is on, and turns amber when it is not getting through */
test('the Wealth tile shows the synced mark only when Dropbox sync is on', async ({ page }) => {
  const box = {};
  await fakeDropbox(page, box);
  await openHub(page, { accounts:ACC, extra:CONNECTED, entries:{ '2026-10-01':{ v:{ a1:500000, a2:500000 }, c:[] } } });
  const mark = page.getByTestId('tile-wealth').getByTestId('wealth-synced');
  await expect(mark).toHaveAttribute('data-state', 'ok');
});
test('no synced mark when Dropbox is not connected', async ({ page }) => {
  await openHub(page);
  await expect(page.getByTestId('tile-wealth').getByTestId('wealth-total')).toBeVisible();
  await expect(page.getByTestId('wealth-synced')).toHaveCount(0);
});
test('the synced mark turns amber when Dropbox refuses', async ({ page }) => {
  await page.route(/dropboxapi\.com/, route => {
    const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'*' };
    if(route.request().method() === 'OPTIONS') return route.fulfill({ status:204, headers:cors });
    return route.fulfill({ status:500, headers:cors, body:'down' });
  });
  await openHub(page, { accounts:ACC, extra:CONNECTED, entries:{ '2026-10-01':{ v:{ a1:500000, a2:500000 }, c:[] } } });
  await expect(page.getByTestId('tile-wealth').getByTestId('wealth-synced')).toHaveAttribute('data-state', 'err');
});

/* 2.2 — Dropbox is the automatic backup: one full backup file a day, the newest 30 kept */
const todayName = '/backups/hub-backup-2026-11-10.json';
const fixToday = page => page.clock.setFixedTime(new Date('2026-11-10T09:00:00'));
const ONE = { '2026-10-01':{ v:{ a1:500000, a2:500000 }, c:[] } };

test('backup: after the start-up sync a backup for today goes up, with accounts and entries inside', async ({ page }) => {
  await fixToday(page);
  const box = {};
  await fakeDropbox(page, box);
  await openHub(page, { accounts:ACC, extra:CONNECTED, entries:ONE });
  await expect.poll(() => Object.keys(box.backups).join()).toBe(todayName);
  const b = JSON.parse(box.backups[todayName]);
  expect(b.wealthAccounts.map(a => a.id)).toEqual(['a1', 'a2']);
  expect(Object.keys(b.wealthEntries)).toEqual(['2026-10-01']);
});

test('backup: a second sync on the same day uploads no second backup', async ({ page }) => {
  await fixToday(page);
  const box = {};
  await fakeDropbox(page, box);
  await openHub(page, { accounts:ACC, extra:CONNECTED, entries:ONE });
  await expect.poll(() => Object.keys(box.backups).length).toBe(1);
  const first = box.backups[todayName], seen = box.downloads;
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-sync').locator('summary').click();
  await page.getByTestId('sync-now').click();
  await expect.poll(() => box.downloads).toBeGreaterThan(seen);
  await expect(page.getByTestId('sync-status')).toContainText('last synced');
  expect(Object.keys(box.backups)).toEqual([todayName]);
  expect(box.backups[todayName]).toBe(first);
});

test('backup: with 32 backups in the folder the oldest 2 go, and nothing else is touched', async ({ page }) => {
  await fixToday(page);
  const old = [];
  for(let i = 1; i <= 31; i++) old.push('hub-backup-2026-10-' + String(i).padStart(2, '0') + '.json');   /* 31 old + today = 32 */
  old.push('notes.txt', 'hub-backup-final.json');
  const box = { oldBackups: old };
  await fakeDropbox(page, box);
  await openHub(page, { accounts:ACC, extra:CONNECTED, entries:ONE });
  await expect.poll(() => box.deleted.length).toBe(2);
  expect(box.deleted.sort()).toEqual(['/backups/hub-backup-2026-10-01.json', '/backups/hub-backup-2026-10-02.json']);
  expect(Object.keys(box.backups)).toContain('/backups/notes.txt');
  expect(Object.keys(box.backups)).toContain('/backups/hub-backup-final.json');
  expect(Object.keys(box.backups)).toContain(todayName);
});

test('backup: the Your data line shows when the last backup was made', async ({ page }) => {
  await fixToday(page);
  const box = {};
  await fakeDropbox(page, box);
  await openHub(page, { accounts:ACC, extra:CONNECTED, entries:ONE });
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-data').locator('summary').click();
  await expect(page.getByTestId('dropbox-backup-line')).toContainText('Dropbox keeps a backup every day');
  await expect(page.getByTestId('dropbox-backup-line')).toContainText('last: today 09:00');
});

test('backup: a refused backup never breaks the sync, and the line says why', async ({ page }) => {
  await fixToday(page);
  const box = { failBackup:true };
  await fakeDropbox(page, box);
  await openHub(page, { accounts:ACC, extra:CONNECTED, entries:ONE });
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-sync').locator('summary').click();
  await expect(page.getByTestId('sync-status')).toContainText('last synced');
  await page.getByTestId('fold-data').locator('summary').click();
  await expect(page.getByTestId('dropbox-backup-line')).toContainText('insufficient_space');
});

test('backup: the line is not there while Dropbox is not connected', async ({ page }) => {
  await openHub(page);
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-data').locator('summary').click();
  await expect(page.getByTestId('dropbox-backup-line')).toBeHidden();
});

/* 2.3 — Restore from Dropbox: the last few daily backups, picked right in Your data */
const backupOf = ents => JSON.stringify({ links:[{ id:'l1', name:'Mail', url:'https://mail.example' }],
  wealthAccounts:ACC, wealthEntries:ents });

test('restore from Dropbox: the newest 7 backups are listed, newest first, nothing else', async ({ page }) => {
  await fixToday(page);
  const old = [];
  for(let i = 1; i <= 9; i++) old.push('hub-backup-2026-11-0' + i + '.json');
  old.push('notes.txt', 'hub-backup-final.json');
  const box = { oldBackups: old };
  await fakeDropbox(page, box);
  await openHub(page, { accounts:ACC, extra:CONNECTED, entries:ONE });
  await expect.poll(() => Object.keys(box.backups)).toContain(todayName);
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-data').locator('summary').click();
  await page.getByTestId('dropbox-restore').click();
  const items = page.getByTestId('dropbox-backup-item');
  await expect(items).toHaveCount(7);
  await expect(items.first()).toHaveAttribute('data-path', todayName);
  await expect(items.first()).toContainText('Today');
  await expect(items.nth(1)).toContainText('Mon 9 Nov');
  await expect(items.last()).toHaveAttribute('data-path', '/backups/hub-backup-2026-11-04.json');
  await page.getByTestId('dropbox-restore-cancel').click();
  await expect(page.getByTestId('dropbox-restore-list')).toBeHidden();
});

test('restore from Dropbox: a picked backup adds its entries, and what is here stays', async ({ page }) => {
  await fixToday(page);
  const box = {};
  await fakeDropbox(page, box);
  await openHub(page, { accounts:ACC, extra:CONNECTED, entries:ONE });
  await expect.poll(() => Object.keys(box.backups)).toContain(todayName);
  box.backups['/backups/hub-backup-2026-11-08.json'] = backupOf({ '2026-09-01':{ v:{ a1:400000, a2:400000 }, c:[] },
                                                                 '2026-10-01':{ v:{ a1:1, a2:1 }, c:[] } });
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-data').locator('summary').click();
  await page.getByTestId('dropbox-restore').click();
  const dialogs = [];
  page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  await page.locator('[data-testid="dropbox-backup-item"][data-path="/backups/hub-backup-2026-11-08.json"]').click();
  await expect.poll(async () => Object.keys(await localEntries(page)).sort().join()).toBe('2026-09-01,2026-10-01');
  expect((await localEntries(page))['2026-10-01'].v.a1).toBe(500000);
  expect(dialogs[0]).toContain('Sun 8 Nov');
  await expect.poll(() => dialogs.join('|')).toContain('Backup restored');
});

test('restore from Dropbox: not offered while Dropbox is not connected', async ({ page }) => {
  await openHub(page);
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-data').locator('summary').click();
  await expect(page.getByTestId('backup-restore')).toBeVisible();
  await expect(page.getByTestId('dropbox-restore')).toBeHidden();
});

/* 2.4 — Back up now: an extra backup on the spot, named with the time, never replacing today's */
test('back up now: a backup with the time in its name goes up, and today\'s daily one stays', async ({ page }) => {
  await fixToday(page);
  const box = {};
  await fakeDropbox(page, box);
  await openHub(page, { accounts:ACC, extra:CONNECTED, entries:ONE });
  await expect.poll(() => Object.keys(box.backups)).toContain(todayName);
  const daily = box.backups[todayName];
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-data').locator('summary').click();
  await page.getByTestId('dropbox-backup-now').click();
  const extra = '/backups/hub-backup-2026-11-10-0900.json';
  await expect.poll(() => Object.keys(box.backups).sort()).toEqual([extra, todayName]);
  expect(box.backups[todayName]).toBe(daily);
  expect(Object.keys(JSON.parse(box.backups[extra]).wealthEntries)).toEqual(['2026-10-01']);
  await expect(page.getByTestId('toast')).toContainText('Backup saved in Dropbox');
  await page.getByTestId('dropbox-restore').click();
  await expect(page.getByTestId('dropbox-backup-item').first()).toHaveAttribute('data-path', extra);
  await expect(page.getByTestId('dropbox-backup-item').first()).toContainText('09:00');
});

test('back up now: counts toward the newest 30, so the oldest daily one goes', async ({ page }) => {
  await fixToday(page);
  const old = [];
  for(let i = 1; i <= 29; i++) old.push('hub-backup-2026-10-' + String(i).padStart(2, '0') + '.json');   /* 29 old + today = 30 */
  const box = { oldBackups: old };
  await fakeDropbox(page, box);
  await openHub(page, { accounts:ACC, extra:CONNECTED, entries:ONE });
  await expect.poll(() => Object.keys(box.backups)).toContain(todayName);
  expect(box.deleted).toEqual([]);
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-data').locator('summary').click();
  await page.getByTestId('dropbox-backup-now').click();
  await expect.poll(() => box.deleted).toEqual(['/backups/hub-backup-2026-10-01.json']);
});

test('back up now: not offered while Dropbox is not connected', async ({ page }) => {
  await openHub(page);
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-data').locator('summary').click();
  await expect(page.getByTestId('backup-save')).toBeVisible();
  await expect(page.getByTestId('dropbox-backup-now')).toHaveCount(1);
  await expect(page.getByTestId('dropbox-backup-now')).toBeHidden();
});
