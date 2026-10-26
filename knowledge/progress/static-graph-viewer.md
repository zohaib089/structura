# Static graph viewer

**Date:** 2026-10-26

## Delivered

- V-01/V-02 (parent branch): worker parser, aggregated overview, caps, single-file build. That branch keeps `entryCandidate`, applies the published defaults for omitted `importKind` and `typeOnly`, and loads the engine canary.
- This change adopts the viewer design on top of that branch. Tokens are appended to `apps/web/src/styles/variables.css`. `BrandMark` and the logo files under `apps/web/public/brand/` are used in the viewer shell only. Navbar, footer, and dashboard visuals are unchanged.
- The shell adds search, filters, focus, coverage, a legend, a budget meter, and a drift panel that stays "not configured" when the file has no drift findings. Click selects. Enter or double-click expands.
- Bundled import edges show `importKind` and `typeOnly` in the detail panel. A bundle of more than one kind is labeled mixed.
- Render caps stay 300 / 50 / 1000. The budget meter uses the hard cap and warns at 80%. 150 / 300 remains the comfort setting.

## Not in this change

The landing-page rebuild is a separate pull request. The viewer does not upload or execute customer source.

## Run

```sh
npm --prefix apps/web run dev:viewer
npm --prefix apps/web run build:viewer
```

Open `apps/web/dist-viewer/index.html` via `file://`. Use the picker or drop a file. `?graph=` is unsupported.
