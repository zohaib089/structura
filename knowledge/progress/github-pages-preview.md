# GitHub Pages live preview

**Date:** 2026-11-02

## Delivered

- `.github/workflows/pages.yml` builds the landing app and single-file viewer on pushes to `main` (and `workflow_dispatch`), then deploys to GitHub Pages with the official `configure-pages`, `upload-pages-artifact`, and `deploy-pages` actions.
- `VITE_BASE` sets Vite `base` for each build (`/structura/` for the landing app, `/structura/viewer/` for the viewer). Local dev and CI keep the previous defaults (`/` and `./`).
- `VITE_HOSTED_APP=false` and `VITE_VIEWER_BOOT_SAMPLE=true` on the Pages viewer build load the bundled sample graph on first paint.
- The assembled artifact includes `.nojekyll` and `404.html` (copy of `index.html`) for client-side locale routing.

## Operator note

In the repository **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
