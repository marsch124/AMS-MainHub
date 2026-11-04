/* Test 16 — the Dropbox buttons (2.2). His ask: "make the three buttons nicer —
   one line, an icon, no text". Sync now, Disconnect and Check for app update sit
   on ONE line as hand-drawn icons; Sync is full colour (never grey or black). */
const { test, expect } = require('@playwright/test');
const { openHub } = require('./helpers');

const CONNECTED = { 'amshub.dropbox': JSON.stringify({ refresh:'RT', access:'AT', exp: Date.now() + 3600e3, last: new Date().toISOString() }) };

async function openSync(page, extra){
  await page.route(/dropboxapi\.com/, r => r.fulfill({ status:409, headers:{ 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'*' }, body:'{"error_summary":"path/not_found/"}' }));
  await openHub(page, { extra });
  await page.getByTestId('settings-btn').click();
  await page.getByTestId('fold-sync').locator('summary').click();
}

test('connected: Sync, Disconnect and Update are three icons on one line', async ({ page }) => {
  await openSync(page, CONNECTED);
  const ids = ['sync-now', 'sync-off', 'sync-update'];
  const boxes = [];
  for(const id of ids){
    const b = page.getByTestId(id);
    await expect(b).toBeVisible();
    await expect(b).toHaveText('');                       // no words on the button
    await expect(b.locator('svg use')).toHaveCount(1);    // a hand-drawn icon
    await expect(b).toHaveAttribute('aria-label', /.+/);  // still named for VoiceOver
    boxes.push(await b.boundingBox());
  }
  const mid = bx => bx.y + bx.height / 2;
  expect(Math.abs(mid(boxes[0]) - mid(boxes[1]))).toBeLessThan(2);
  expect(Math.abs(mid(boxes[0]) - mid(boxes[2]))).toBeLessThan(2);
  for(const bx of boxes) expect(bx.height).toBeLessThan(46);
  /* the main button is full colour: clearly coloured, not grey or black */
  const rgb = await page.getByTestId('sync-now').evaluate(e => getComputedStyle(e).backgroundColor.match(/\d+/g).map(Number));
  expect(Math.max(...rgb) - Math.min(...rgb)).toBeGreaterThan(60);
  /* the wide button lower down is gone while the row carries it */
  await expect(page.locator('#updateBtn')).toBeHidden();
});

test('the update icon still checks for an update', async ({ page }) => {
  await openSync(page, CONNECTED);
  let asked = 0;
  await page.route(/version\.json\?vercheck=/, r => { asked++; r.fulfill({ status:200, contentType:'application/json', body:'{"version":"0.0-test"}' }); });
  await page.getByTestId('sync-update').click();
  await expect.poll(() => asked).toBeGreaterThan(0);
});

test('not connected: the wide Check for app update stays', async ({ page }) => {
  await openSync(page, {});
  await expect(page.getByTestId('sync-connect')).toBeVisible();
  await expect(page.locator('#updateBtn')).toBeVisible();
});
