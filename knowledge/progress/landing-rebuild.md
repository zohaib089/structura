# Landing rebuild

**Date:** 2026-10-26

## Delivered

- Replaced the landing page with the section list from the UI review: hero, quickstart, edge provenance, coverage, drift, how it works, and known limits.
- Removed the invented statistics, the client logo strip, the testimonials, the contact form that did not send anything, and the System Online pill.
- The hero shows a copyable command from `quickstartCommand()` and the real viewer canvas on the bundled sample graph, labelled as sample data.
- Signup no longer pre-ticks the terms checkbox.
- `VITE_HOSTED_APP` hides login, signup, and the dashboard when set to `false`. The default is on, so existing hosted flows keep working. Auth and dashboard screens were not redesigned.
- The shared header wordmark reads the brand constant. New landing copy is English for every locale until it is translated.

## Depends on

This branch starts from the static viewer branch because the landing page imports `packages/brand` and the viewer canvas.
