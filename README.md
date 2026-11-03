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
