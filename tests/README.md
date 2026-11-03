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
| `wealth-entry-saves.spec.js` — a typed entry is saved, totalled and shown | the thousands rule (900 → 900 000) or the running total breaks; Save stops storing; the tile or History does not show the new entry |
| `send-to-excel.spec.js` — Send to Excel asks first, then sends the right month and figures | the dry run is skipped; it writes without a yes; the wrong month or wrong figures are sent; a no still writes |
| `wealth-mismatch.spec.js` — a workbook that disagrees is flagged in amber, one that agrees stays quiet | the check goes silent or grey again; it shows when the numbers agree |
| `night-colours.spec.js` — day keeps its pale tints, night is dark with every tile in its own colour | night stops working; tiles go pale or all the same by night; the main button goes pale; switching while open does nothing |
| `backup-round-trip.spec.js` — the backup file contains his data and brings it back | the backup file is written empty or incomplete (no entries, no links); the restore silently drops something; the file cannot stand on its own on a fresh device |

Each one was **seen failing** before it was kept: the oldest total instead of
the newest, the saved entries not read back, the pen disconnected, the window
opening on New entry, a backup written without the entries, a backup written
without the links, a restore that drops the entries, Save not storing, Send to
Excel skipping its dry run, a no that still writes, no night look, night not
switching while open, and a silent workbook check — all thirteen were caught.

The backup and Send to Excel tests run at Mac size only (Send to Excel exists
only on the Mac; the test plays the Finance engine itself, so the real
workbook is never reached).

The backup test runs at Mac size only. Saving a backup goes three different
ways (Apple's Save window on the Mac, the share sheet on a phone, a plain
download anywhere else) and a test browser is the third kind.

Both run twice, once at Mac size and once at iPhone size.

## Also covered elsewhere

The two little programs behind Send to Excel, which do the actual writing,
are tested in the AMS Finance repo (`tests/test_wealth.py`), on every push.

## Running them here

Nothing to install by hand; `npm ci` in this folder, then `npx playwright test`.
The tests start their own little web server, seed their own wealth data, and
answer for the other AMS apps and the Finance engine themselves, so they never
touch the real ones and never need the network.
