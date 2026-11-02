/* Shared set-up for the hub's tests.
   Everything a test needs to be the same on every machine lives here:
   seeded wealth data, no service worker, and no calls out to the web
   or to the Finance engine on the Mac. */

/* Two accounts and three dated entries. Totals: 1.00M, 1.10M, 1.25M kr. */
const SEED = {
  accounts: [
    { id:'a1', name:'ISK',      url:'' },
    { id:'a2', name:'Snabbspar', url:'' },
  ],
  entries: {
    '2026-07-01': { v:{ a1:600000, a2:400000 }, c:[] },
    '2026-08-01': { v:{ a1:700000, a2:400000 }, c:[] },
    '2026-09-01': { v:{ a1:800000, a2:450000 }, c:[] },
  },
};
const NEWEST_TOTAL_M = '1.25M';

/* Open the hub with that data already in place and nothing reaching out. */
async function openHub(page, seed = SEED){
  /* the hub asks other AMS apps and the Mac engine for their versions —
     answer for them, so a test never depends on the network */
  await page.route('**/*', route => {
    const url = route.request().url();
    if(url.startsWith('http://localhost:7780') || url.includes('marsch124.github.io')){
      return route.fulfill({ status:404, body:'' });
    }
    return route.continue();
  });
  await page.addInitScript(s => {
    /* service workers are blocked in playwright.config.js — a worker would
       serve an old copy of the page out of the cache */
    localStorage.clear();
    if(s){
      localStorage.setItem('amshub.wealth.accounts', JSON.stringify(s.accounts));
      localStorage.setItem('amshub.wealth.entries',  JSON.stringify(s.entries));
    }
  }, seed);
  await page.goto('/index.html');
  /* the page itself says when start-up has finished */
  await page.locator('html[data-ready]').waitFor({ timeout: 10000 });
}

module.exports = { openHub, SEED, NEWEST_TOTAL_M };
