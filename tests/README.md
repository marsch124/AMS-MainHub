# The hub's tests

These run by themselves on GitHub every time the hub is published, and the
hub is **only** published if they pass. A red run publishes nothing, so the
copy on the iPhone stays on the last good version.

Every control is found by its own identifier (`data-testid`), never by the
words on screen, so changing a label cannot break a test — and a test cannot
pass just because some other part of the page happens to say the same word.

## What each test guards

| Test | What would have to break for it to go red |
|---|---|
| `hub-opens.spec.js` — the hub opens and the Wealth tile shows the newest total | start-up stops finishing; saved wealth accounts or entries are no longer read back; the tile shows an older entry, a blank, or the "—" stand-in instead of the newest total; the pen disappears; anything throws an error during start-up |
| `hub-opens.spec.js` — with no saved data the tile says so | a brand-new hub shows a made-up number instead of "—" |
| `wealth-pen-opens.spec.js` — the pen opens the wealth window on History, and Close shuts it | the pen is not connected; the window does not open; it opens on the wrong tab; Close does not shut it |

Each one was **seen failing** before it was kept: the oldest total instead of
the newest, the saved entries not read back, the pen disconnected, and the
window opening on New entry — all four were caught.

Both run twice, once at Mac size and once at iPhone size.

## Still to cover

Saving an entry, the backup file, and **Send to Excel** — the next ones to add.

## Running them here

Nothing to install by hand; `npm ci` in this folder, then `npx playwright test`.
The tests start their own little web server, seed their own wealth data, and
answer for the other AMS apps and the Finance engine themselves, so they never
touch the real ones and never need the network.
