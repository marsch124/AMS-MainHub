# AMS Main Hub

One shelf for every AMS app. A small offline-capable PWA that shows a card per
app — hand-drawn icon, one-line description, and a **live version chip**
fetched straight from each app — plus a Mac tools shelf for the local apps and
a **Your links** section for personal links (stored only on the device,
never in this public repo). Three small tiles on top: Retirement, The year,
Apps.

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

## Retired on 24 Nov 2026 (version 2.5)

Money matters now live in the native app AMS Financial Steward, so the hub
shows only three tiles (Retirement, The year, Apps) and three shelves
(Everyday apps, Mac tools, Your links). Retired and no longer shown or linked:
the Wealth and Wealth · 0 tiles, the pencil and the wealth window (History,
New entry, Accounts, Year), the forecast, the growth line, the monthly
reminder, the workbook cross-check (amber line, pencil dot, History marks),
Send to Excel, the Finance tile, and the FINANCE shelf with its cards (AMS
Finance Hub, Spend Dashboard, Finance Dashboard, Latest report). Sam moved to
the Mac tools shelf. Nothing was deleted: the stored wealth accounts and
entries stay on each device, in every backup file and Dropbox backup, and
Dropbox sync still keeps them equal on iPhone and Mac. The old Finance Hub page
(`localhost:7780/finance`), the two claude.ai dashboards and Sam's monthly
finance report are an archive. On the Mac the hub is still served at
`localhost:7780/hub/` by the small engine that starts at login.

The sections below that describe wealth, the workbook check, the forecast, the
sync mark and the top-area grid are **history** of how those parts were built
(the data and the Dropbox sync underneath still work as described).

## 2.0 — Dropbox sync, forecast, Year (forecast and Year are retired in 2.5; sync and backups still run)

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
