# AMS Main Hub

One shelf for every AMS app. A small offline-capable PWA that shows a card per
app — hand-drawn icon, one-line description, and a **live version chip**
fetched straight from each app — plus a MAC ONLY section for the local apps and
a **Your links** section for personal dashboards (stored only on the device,
never in this public repo).

Live at: https://marsch124.github.io/AMS-MainHub/

## Day and night

Settings has a **Look** row: Day · Night · Automatic (`data-testid`
`look-day` / `look-night` / `look-auto`), stored per device in localStorage
`amshub.theme` (`day` | `night`; nothing = Automatic). Automatic follows the
device's light or dark setting (`prefers-color-scheme`) and switches while
open; Day and Night ignore the device. The choice is applied as
`html[data-look="day|night"]` by a tiny script in `<head>` before the first
paint, then kept current by `applyTheme()`, which also points both
`theme-color` metas at the chosen paper. Night tokens live in one block of
`html[data-look="night"]` rules at the end of the stylesheet; `isDark()` reads
the attribute. Cards and tiles keep their own colour by night: `tintOf()`
mixes each one's `dot` colour 76% into the night card (`#26221e`) instead of
using its pale day `tint`; cards behind a door (`kidTint()`) go 88%. The main
button is the accent colour by night, never the pale ink.

## The workbook cross-check

On the Mac the engine's `/wealth` series is compared with his own newest
entry. When they differ, the Wealth tile shows an amber `workbook …` line
(`data-testid="wealth-mismatch"`); its tip gives the gap and direction. On
the header strip it replaces the "since" line. When they agree, nothing.

History marks the month too: under the TOTAL of each month's **last** entry
whose workbook figure differs, an amber `workbook …` line
(`data-testid="hist-mismatch"`, `data-month="YYYY-MM"`, same tip). The
Earlier entries rows carry the same mark. Months that agree show nothing.

Since 1.60 the mark is a `<button data-hedit>`: tapping it opens that
entry exactly as Adjust does. And the Wealth pencil carries an amber dot
(`data-testid="pen-dot"`) whenever **any** month's last entry disagrees
(`offMonths()`), not only the newest; its `aria-label` and tip give the
count. `markPen()` runs after every redraw of the Wealth tile.

Since 1.61 the tile's amber line is a `<button data-tedit="YYYY-MM-DD">`
(the newest entry); one document-level click listener opens the sheet and
calls `editEntry(d)` — the same function Adjust and the History marks use.
It sits above the pen's big invisible target (`z-index:2`); on a phone it
is cut short with an ellipsis. The pen dot now holds the count of
`offMonths()` (white figure by day, `#1b1815` by night, 16px pill).
This closes the amber workbook-check work.

Since 1.62 the tile's grey line under the total shows **this year's growth**
(`data-testid="wealth-growth"`, `yearGrowth()`): newest entry against the
first entry dated this calendar year; if the newest is the only one this
year, against the last entry before 1 January ("since Jan"). Under 10% one
decimal, else whole; "−" for a fall; no line if the newest entry is from an
earlier year or there is nothing to compare with. It takes the place of the
old "+… since <date>" line (the Wealth · 0 tile keeps "all of it, from
zero"); the amber workbook line still overrides it on the header strip.
From the 8th of a month with no entry yet, a honey `<button data-tremind>`
(`data-testid="wealth-reminder"`, `missingMonth()`) reads "Nov not entered
yet"; tapping it opens the sheet on New entry (dated today). Saving an
entry for that month redraws the tile and the line is gone.

Since 1.63 the growth line's `title` gives the change in kronor
("+650k kr since 31 Jan 2026"). From 1 to 7 January, when the newest entry
is from last year, `yearGrowth()` shows last year's result ("+14% in
2026"): that year's last entry against the last entry before it began
(else that year's first entry). From the 8th it is gone until a January
entry exists.

## 2.0 — Dropbox sync, forecast, Year

**Sync.** `DBX_KEY` is the hub's Dropbox app key (App folder access, public by
design: PKCE, no secret). Connect = PKCE "code" flow *without* a redirect URI (since 2.1.3 `dbxPrepare()` builds the authorize URL when the section renders and Connect is a plain `<a target=_blank>` — iOS standalone blocks a `window.open` after an `await`):
`dbxConnectStart()` opens the authorize page, he pastes the code shown,
`dbxConnectFinish()` trades it (with the verifier) for a refresh token, kept in
`amshub.dropbox` on that device only. The file is `/wealth.json` in the app folder:
`{ app, savedAt, accounts, entries, deleted }`. `saveWealth()` now calls
`stampWealth()`, which compares with what was stored and gives every changed entry
and account an `at`, and writes a tombstone into `amshub.wealth.deleted` for each
vanished date — so every writer is covered. `syncNow()`: download (rev) →
`mergeWealth()` (per date the newest of entry/tombstone wins; ties go to the
Dropbox copy so devices converge; accounts by id, newer `at`, ties to Dropbox) →
store locally if different → upload with `mode:update:<rev>` unless Dropbox already
holds the same (`wealthSig()`, order-free); a 409 `path/conflict` re-runs, up to 3 times; since 2.0.1 any other refusal is thrown with Dropbox's `error_summary` and shown as "Not synced — …", and `last` only moves when the file went up or was already equal.
Runs at start-up, 1.2 s after each save (`syncSoon()`), on return to the page,
and on Sync now. Links, look and the sent-to-Excel marks are not synced.

**Daily backup (2.2).** After a successful `syncNow()`, `dbxBackup(tok)` uploads
`backupBlob()` once per local day to `/backups/hub-backup-YYYY-MM-DD.json`
(overwrite), then lists `/backups` and `delete_v2`s all but the newest 30 files
named `hub-backup-YYYY-MM-DD.json`. State in `amshub.dropbox`: `backupDay`,
`backupAt`, `backupErr`; `renderBackupLine()` → `dropbox-backup-line` in Your data.

**Restore from Dropbox (2.3).** `#dbxRestoreBtn` (`dropbox-restore`, shown only while
`dbxOn()`) lists `/backups`, keeps names matching `DBX_BACKUP_NAME`, sorts newest
first and shows `DBX_RESTORE_SHOW` = 7 as `dropbox-backup-item` buttons (`data-path`,
label "Mon 9 Nov" + Today / Yesterday / N days ago) plus `dropbox-restore-cancel`.
A tap confirms, downloads that file and hands it to `restoreFrom(data)` — the same
function Import / restore uses, so wealth is put back with `putBackWealth()` (adds only).

**Back up now (2.4).** `#dbxNowBtn` (`dropbox-backup-now`, only while `dbxOn()`)
calls `dbxPutBackup(tok, 'hub-backup-YYYY-MM-DD-HHMM.json')` — the shared upload +
prune that `dbxBackup()` also uses; `DBX_BACKUP_NAME` allows the optional `-HHMM`.
`dbxListBackups()` sorts newest first by `backupKey()` (a daily file counts as 0000);
the newest 30 of all kinds are kept. Restore list label adds ", HH:MM".

**Forecast (2.3).** "by then" is `<span class="fby">`, hidden at ≤600px; the phone
forecast is `white-space:nowrap`, one line.
**Sync mark (2.2).** `markSync()` (from `markPen()` and `renderSync()`) puts
`svg.msync[data-testid=wealth-synced][data-state=ok|err]` in the Wealth tile's name.

**Top area (2.2).** `header .mrow` is a 3-column grid on the phone and the Mac;
on the phone the pen sits at the end of the name row (40×34 target, 19px pen).

**Forecast.** `wealthForecast()` → `retire-forecast` on the Retirement tile:
newest entry vs the first entry on/after a year before it (else the oldest),
linear to `RETIREMENT`; none under 60 days of span.

**Year.** Fourth wealth tab `year` (`viewYear()` / `yearReview(y)`): start = last
entry before the year (else its first), end = its last entry; accounts
alphabetical; month changes from each month's last entry against the one before;
best/worst (`year-best` / `year-worst`); one entry → `year-single`.

## 2.1 — hardening

- **Restore adds, never replaces.** `putBackWealth(accs, ents)` is shared by Import / restore and
  History's "Put those entries back": an account id or entry date already here is left alone; a
  missing one is added with `at = now`, so it beats any Dropbox tombstone (`deleted[d]`) and the
  sync does not delete it again. Nothing missing from the backup is tombstoned any more (before,
  `wEnt = ents; saveWealth()` made `stampWealth()` note every newer date as deleted and the sync
  spread that). The restore alert adds "N dates already here kept as they are". A backup's
  `wealthSnaps` are merged into this device's by day (the fuller `n` wins) instead of replacing them.
- **Refused storage is reported.** `storeJSON()` returns true/false; `saveWealth()` alerts
  "This device could not keep that change …" when the accounts or entries did not store.
- **Dropbox.** `dbxToken()` turns `invalid_grant` on a refresh into "Dropbox no longer accepts this
  connection — tap Disconnect, then Connect Dropbox again". `dbxUpload()` only returns `'ok'` when the
  200 answer is JSON carrying a `rev` (Dropbox's receipt); otherwise "Dropbox did not confirm the file
  was stored".
- Tests: `restore-keeps.spec.js` (new) and three more in `dropbox-sync.spec.js`; all six seen failing first.

## How the version chips work

All the AMS web apps live on the same domain (`marsch124.github.io`), so the
hub can simply fetch each app's `version.json`, `sw.js` or `service-worker.js`
and read the version out of it. No servers, no APIs. When testing locally the
chips stay hidden (cross-origin), which is expected.

## Releasing a change

Keep these three in sync on every release (same rule as the other AMS apps):

1. `VERSIONLOG` in `index.html` (newest entry first — `[0].v` IS the version)
2. `version.json`
3. `CACHE` in `service-worker.js`

…and update the "How this works" guide if behaviour changed.

## Icons

`tools/make_icons.py` (no third-party libraries) renders the app icon —
a calm slate background with a hand-drawn white 2×2 grid, one little square
per corner of the shelf. Run it with any Python 3 to regenerate `icons/`.
