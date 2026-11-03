/* Test 5 — Send to Excel asks first, then sends the right month and figures.
   The hub is opened as the Mac engine serves it (localhost:7780/hub), but every
   engine answer is played by the test: the real engine and the real workbook
   are never reached. The engine's own writing is guarded by the AMS Finance tests. */
const path = require('path');
const { test, expect } = require('@playwright/test');
const { SEED } = require('./helpers');

const ROOT = path.join(__dirname, '..');

async function openAsEngine(page){
  const posts = [];
  await page.route('**/*', async route => {
    const req = route.request(), u = new URL(req.url());
    if(u.origin === 'http://localhost:7780'){
      if(u.pathname.startsWith('/hub/')) return route.fulfill({ path: path.join(ROOT, u.pathname.slice(5)) });
      if(u.pathname === '/api/sendwealth'){
        const body = JSON.parse(req.postData());
        posts.push(body);
        return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(body.dryRun
          ? { ok:true, plan: body.accounts.map(a => ({ ...a, now: 0 })) }
          : { ok:true, skipped:[] }) });
      }
      return route.fulfill({ status:404, body:'' });
    }
    if(u.hostname === 'marsch124.github.io') return route.fulfill({ status:404, body:'' });
    return route.continue();
  });
  /* WebKit runs no init script on a page the test itself answers, so plant the
     data on first load and open the hub again (a fresh context: nothing else in it) */
  await page.goto('http://localhost:7780/hub/index.html');
  await page.evaluate(s => {
    localStorage.setItem('amshub.wealth.accounts', JSON.stringify(s.accounts));
    localStorage.setItem('amshub.wealth.entries',  JSON.stringify(s.entries));
  }, SEED);
  await page.reload();
  await page.locator('html[data-ready]').waitFor({ timeout: 10000 });
  await page.getByTestId('tile-wealth').getByTestId('wealth-pen').click();
  await page.getByTestId('wtab-entry').click();
  await page.getByTestId('entry-date').fill('2026-09-01');
  return posts;
}

const SEPTEMBER = [{ name:'ISK', kr:800000 }, { name:'Snabbspar', kr:450000 }];

test.describe('Send to Excel', () => {
  test('shows what it will write, and writes only after a yes', async ({ page }, info) => {
    test.skip(info.project.name !== 'mac', 'the workbook lives on the Mac');
    const posts = await openAsEngine(page);
    let asked = '';
    page.on('dialog', d => { asked = d.message(); d.accept(); });

    await page.getByTestId('wealth-send').click();
    await expect(page.getByTestId('toast')).toContainText('September sent to Excel');

    /* a dry run first, then the real write — the same month, the same figures */
    expect(posts.map(p => p.dryRun)).toEqual([true, false]);
    posts.forEach(p => { expect(p.month).toBe('2026-09'); expect(p.accounts).toEqual(SEPTEMBER); });
    expect(asked).toContain('ISK  →  800 000 kr');
    expect(asked).toContain('Snabbspar  →  450 000 kr');
  });

  test('a no writes nothing', async ({ page }, info) => {
    test.skip(info.project.name !== 'mac', 'the workbook lives on the Mac');
    const posts = await openAsEngine(page);
    page.on('dialog', d => d.dismiss());

    await page.getByTestId('wealth-send').click();
    await expect(page.getByTestId('toast')).toContainText('Not sent');
    expect(posts.map(p => p.dryRun)).toEqual([true]);
  });
});
