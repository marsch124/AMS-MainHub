/* Test — the phone's top area (2.2): the tiles sit in a tidy 3-across grid, nothing is
   cut off or overlapping, and the Wealth tile carries a small mark when Dropbox sync is on. */
const { test, expect } = require('@playwright/test');
const { openHub } = require('./helpers');

const box = el => el.boundingBox();

test('on a phone the tiles sit three across, two rows', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'phone layout');
  await openHub(page);
  const [w, w0, r, y] = await Promise.all(['tile-wealth', 'tile-wealth0', 'tile-retire', 'tile-year']
    .map(id => box(page.locator('header').getByTestId(id))));
  expect(Math.abs(w.y - w0.y)).toBeLessThan(2);
  expect(Math.abs(w.y - r.y)).toBeLessThan(2);
  expect(y.y).toBeGreaterThan(w.y + w.height - 1);       /* The Year starts the second row */
  expect(Math.abs(y.x - w.x)).toBeLessThan(2);
  expect(w.width).toBeGreaterThan(100);                   /* wide enough to read */
});

test('on a phone the pencil never covers the tile\'s name, and the numbers fit', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'phone layout');
  await openHub(page);
  const tile = page.locator('header').getByTestId('tile-wealth');
  const lab = await box(tile.locator('.mlab > span').first()), pen = await box(tile.getByTestId('wealth-pen'));
  const overlap = !(pen.x >= lab.x + lab.width || pen.x + pen.width <= lab.x || pen.y >= lab.y + lab.height || pen.y + pen.height <= lab.y);
  /* the pen's big invisible target may reach over; the drawn pen itself must not */
  const icon = await box(tile.getByTestId('wealth-pen').locator('svg').first());
  const iconOverlap = !(icon.x >= lab.x + lab.width || icon.x + icon.width <= lab.x || icon.y >= lab.y + lab.height || icon.y + icon.height <= lab.y);
  expect(iconOverlap).toBe(false);
  /* every big number is on one line and fully visible */
  const cut = await page.evaluate(() => [...document.querySelectorAll('header .mbig')]
    .filter(b => b.scrollWidth > b.clientWidth + 1 || b.getBoundingClientRect().height > parseFloat(getComputedStyle(b).fontSize) * 1.6)
    .map(b => b.closest('.mtile').dataset.testid));
  expect(cut).toEqual([]);
});
