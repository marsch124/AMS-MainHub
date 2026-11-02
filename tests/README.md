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
| `backup-round-trip.spec.js` — the backup file contains his data and brings it back | the backup file is written empty or incomplete (no entries, no links); the restore silently drops something; the file cannot stand on its own on a fresh device |

Each one was **seen failing** before it was kept: the oldest total instead of
the newest, the saved entries not read back, the pen disconnected, the window
opening on New entry, a backup written without the entries, a backup written
without the links, and a restore that drops the entries — all seven were caught.

The backup test runs at Mac size only. Saving a backup goes three different
ways (Apple's Save window on the Mac, the share sheet on a phone, a plain
download anywhere else) and a test browser is the third kind.

Both run twice, once at Mac size and once at iPhone size.

## Still to cover

Saving an entry, and **Send to Excel** end to end from the hub. The two little
programs behind Send to Excel are themselves tested in the AMS Finance repo
(`tests/test_wealth.py`), on every push.

## Running them here

Nothing to install by hand; `npm ci` in this folder, then `npx playwright test`.
The tests start their own little web server, seed their own wealth data, and
answer for the other AMS apps and the Finance engine themselves, so they never
touch the real ones and never need the network.
