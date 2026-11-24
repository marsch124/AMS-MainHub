/* Test — the phone's top area (2.5): the three tiles sit in ONE row, side by side, and no
   big number is cut off or runs onto a second line. */
const { test, expect } = require('@playwright/test');
const { openHub } = require('./helpers');

const box = el => el.boundingBox();

test('on a phone the three tiles sit in one row', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'phone layout');
  await openHub(page);
  const [r, y, v] = await Promise.all(['tile-retire', 'tile-year', 'tile-versions']
    .map(id => box(page.locator('header').getByTestId(id))));
  expect(Math.abs(r.y - y.y)).toBeLessThan(2);
  expect(Math.abs(r.y - v.y)).toBeLessThan(2);
  expect(y.x).toBeGreaterThan(r.x + r.width - 2);          /* side by side, not stacked */
  expect(v.x).toBeGreaterThan(y.x + y.width - 2);
  expect(r.width).toBeGreaterThan(90);                      /* wide enough to read */
  const view = page.viewportSize().width;
  expect(v.x + v.width).toBeLessThanOrEqual(view + 1);      /* nothing runs off the screen */
});

test('on a phone every big number is on one line and fully visible', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'phone layout');
  await openHub(page);
  const cut = await page.evaluate(() => [...document.querySelectorAll('header .mbig')]
    .filter(b => b.scrollWidth > b.clientWidth + 1 || b.getBoundingClientRect().height > parseFloat(getComputedStyle(b).fontSize) * 1.6)
    .map(b => b.closest('.mtile').dataset.testid));
  expect(cut).toEqual([]);
});
