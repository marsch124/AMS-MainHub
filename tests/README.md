# The hub's tests

These run by themselves on GitHub every time the hub is published, and the
hub is **only** published if they pass. A red run publishes nothing, so the
copy on the iPhone stays on the last good version.

Every control is found by its own identifier (`data-testid`), never by the
words on screen, so changing a label cannot break a test — and a test cannot
pass just because some other part of the page happens to say the same word.

## What each test guards

Since 2.5 the hub no longer shows money: the wealth tile, its window, Send to
Excel and the Finance shelf are gone. His saved wealth data stays in the
browser, in the backup file and in Dropbox, and these tests keep it that way.

| Test | What would have to break for it to go red |
|---|---|
| `hub-opens.spec.js` — the hub opens with its three tiles and leaves saved data alone | start-up stops finishing or throws an error; one of the three tiles (Retirement, The Year, Versions) is missing; opening the page changes or drops the saved wealth accounts or entries; a brand-new hub with nothing saved fails to open |
| `retired-parts.spec.js` — the retired parts stay gone | a retired tile or the pen comes back, or a fourth tile appears; the Finance shelf or one of its four cards comes back; Sam is not on the Mac shelf; the page asks the engine for `/wealth`, `/hubstatus`, `/hublinks` or `/health` again; the backup file loses the saved entries; a tile choice saved by 2.4 breaks start-up or switches Retirement off |
| `night-colours.spec.js` — day keeps its pale tints, night is dark with every tile in its own colour | night stops working; tiles go pale or all the same by night; the main button (Sync now) goes grey or pale; switching while open does nothing |
| `look-choice.spec.js` — Day / Night / Automatic in Settings | Automatic stops being the default or stops following the device; Night or Day does not hold; the tiles ignore the choice; a saved choice is not there from the start |
| `backup-round-trip.spec.js` — the backup file contains his data and brings it back | the backup file is written empty or incomplete (no entries, no links); the restore silently drops something; the file cannot stand on its own on a fresh device |
| `restore-keeps.spec.js` — restoring an older backup adds what is missing and keeps what is here | an older backup drops newer entries or leaves deletion notes; the backup's safety copies replace this device's |
| `dropbox-sync.spec.js` — connecting, merging, saving against another device (Dropbox played by a stand-in) | the code is not traded or nothing goes up; an older change beats a newer one; a deletion does not travel; an entry is lost; an upload overwrites a copy another device wrote in between; a refused upload is reported as synced; a withdrawn connection does not ask to connect again; an unconfirmed upload is called synced; an entry put back from a file is deleted again by the sync; the daily backup is missing, doubled, deletes the wrong files, or its line is wrong; Restore from Dropbox lists the wrong backups or order, loses an entry here, or shows without Dropbox; Back up now replaces today's daily backup, is not counted in the 30, is missing from the restore list, or shows without Dropbox |
| `sync-buttons.spec.js` — the three Dropbox icons in Settings | Sync now, Disconnect and Check for update are no longer three icons on one line; Sync goes grey; the update icon stops checking; the wide update button shows when it should not |
| `phone-top.spec.js` — the top area at iPhone size | the three tiles fall out of one row or run off the screen; a big number breaks or is cut off |

The backup tests run at Mac size only. Saving a backup goes three different
ways (Apple's Save window on the Mac, the share sheet on a phone, a plain
download anywhere else) and a test browser is the third kind.

The phone-top tests run at iPhone size only; the rest run twice, once at Mac
size and once at iPhone size.

Changes to wealth data are made the way he can still make them: by restoring a
backup file, or by Dropbox handing over a different copy. The tests then look at
what is stored in the browser and at what the stand-in Dropbox received.

## Running them here

Nothing to install by hand; `npm ci` in this folder, then `npx playwright test`.
The tests start their own little web server, seed their own wealth data, and
answer for the other AMS apps and the Finance engine themselves, so they never
touch the real ones and never need the network.
