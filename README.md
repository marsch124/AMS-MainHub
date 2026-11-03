# AMS Main Hub

One shelf for every AMS app. A small offline-capable PWA that shows a card per
app — hand-drawn icon, one-line description, and a **live version chip**
fetched straight from each app — plus a MAC ONLY section for the local apps and
a **Your links** section for personal dashboards (stored only on the device,
never in this public repo).

Live at: https://marsch124.github.io/AMS-MainHub/

## Day and night

The hub follows the device's light or dark setting (`prefers-color-scheme`),
and switches while open. Night tokens live in one `@media` block at the end
of the stylesheet. Cards and tiles keep their own colour by night: `tintOf()`
mixes each one's `dot` colour 76% into the night card (`#26221e`) instead of
using its pale day `tint`; cards behind a door (`kidTint()`) go 88%. The main
button is the accent colour by night, never the pale ink.

## The workbook cross-check

On the Mac the engine's `/wealth` series is compared with his own newest
entry. When they differ, the Wealth tile shows an amber `workbook …` line
(`data-testid="wealth-mismatch"`); its tip gives the gap and direction. On
the header strip it replaces the "since" line. When they agree, nothing.

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
