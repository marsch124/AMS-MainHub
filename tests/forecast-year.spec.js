/* Test 13 — the forecast on the Retirement tile and the Year review (2.0). */
const { test, expect } = require('@playwright/test');
const { openHub } = require('./helpers');

const ACC = [{ id:'a1', name:'ISK', url:'' }, { id:'a2', name:'Avanza', url:'' }];
const e = (a1, a2) => ({ v:{ a1, a2 }, c:[] });

test('the Retirement tile says where the wealth is heading at the pace of the last year', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-03T09:00:00'));
  /* +120k kr in a year; 608 more days to 1 Jul 2028 → about 1.32M kr */
  await openHub(page, { accounts:ACC, entries:{ '2025-11-01': e(500000, 500000), '2026-11-01': e(620000, 500000) } });
  await expect(page.getByTestId('tile-retire').getByTestId('retire-forecast')).toHaveText('≈ 1.32M kr by then');
});

/* 2.3 — on the iPhone the forecast drops "by then" so it fits on one line; the Mac keeps it */
test('the forecast fits on one line on the iPhone, and keeps "by then" on the Mac', async ({ page }, info) => {
  await page.clock.setFixedTime(new Date('2026-11-03T09:00:00'));
  await openHub(page, { accounts:ACC, entries:{ '2025-11-01': e(500000, 500000), '2026-11-01': e(620000, 500000) } });
  const f = page.getByTestId('tile-retire').getByTestId('retire-forecast');
  const phone = info.project.name === 'iphone';
  await expect(f).toHaveText(phone ? '≈ 1.32M kr' : '≈ 1.32M kr by then', { useInnerText:true });
  const lines = await f.evaluate(el => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));
  expect(lines).toBe(1);
});

test('no forecast from entries less than two months apart', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-03T09:00:00'));
  await openHub(page, { accounts:ACC, entries:{ '2026-10-01': e(500000, 500000), '2026-11-01': e(620000, 500000) } });
  await expect(page.getByTestId('tile-retire')).toBeVisible();
  await expect(page.getByTestId('retire-forecast')).toHaveCount(0);
});

test('Year shows the year from start to end, each account, best and weakest month', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-15T09:00:00'));
  await openHub(page, { accounts:ACC, entries:{
    '2025-12-31': e(500000, 500000), '2026-03-31': e(550000, 500000),
    '2026-06-30': e(530000, 500000), '2026-12-31': e(640000, 500000) } });
  await page.getByTestId('wealth-pen').click();
  await page.getByTestId('wtab-year').click();
  await expect(page.getByTestId('year-total')).toContainText('+14%');
  await expect(page.getByTestId('year-total')).toContainText('+140 000 kr');
  await expect(page.getByTestId('year-row-a1')).toContainText('500 000');
  await expect(page.getByTestId('year-row-a1')).toContainText('640 000');
  await expect(page.getByTestId('year-row-a1')).toContainText('+140 000');
  await expect(page.getByTestId('year-best')).toContainText('Dec +110 000 kr');
  await expect(page.getByTestId('year-worst')).toContainText('Jun −20 000 kr');
  /* a year with one entry says so instead of making something up */
  await page.getByTestId('year-pick-2025').click();
  await expect(page.getByTestId('year-single')).toBeVisible();
});
