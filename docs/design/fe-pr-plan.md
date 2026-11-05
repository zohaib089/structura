# Atlasmith FE PR plan (D1–D7)

Replaces the v1 **PR6–PR9** plan in [dashboard-redesign.md](./dashboard-redesign.md) (and reframes PR1–PR5). Visual direction: [visual-direction.md](./visual-direction.md). Interactive mockups (`mockups/index.html`) live with the design agent / approval package and are not in-repo yet. **No FE work until mockups approved.**

Priority order. Radial graph is its **own** PR (D3).

| # | Title | Size | Scope | Acceptance |
|---|---|---|---|---|
| **D1** | Tokens + full-bleed app shell | **M** | Product tokens in `variables.css`: neutral ramp, amber brand/selection, severity `--sev-*`, type 12–32, Inter + JetBrains Mono, radii, motion, reduced-motion. **Primary button = high-contrast neutral** (not cyan/violet gradient, not blue accent). New `AppShell` / `Sidebar` (~220–240px) / `TopBar` (breadcrumbs, ⌘K stub). Nested routes `/w/:ws/...`; `/dashboard` redirect. **Full-bleed content** — no max-width container, no nested card chrome in shell. Retire product use of cyan/violet/glow. | Both themes render shell. AA text pairs. Active nav amber bar. Focus ring visible. Existing dashboard mounts inside shell without narrow centred column. Grep: no cyan primary buttons in product shell. |
| **D2** | Fold viewer into dashboard (Graph tab) | **M** | Graph as tab/route inside shell (`…/scans/:sid/graph` or project Graph tab). Load from scan API; delete storage handoff + `viewerHref` link-out. Remove compose `viewer` / **:8080** (optional public `/viewer` only if landing sample needs it). Keep **current overview layout temporarily** if needed — radial is D3. Migrate viewer components to shared tokens. | Graph same-origin inside shell; Back works; no :8080. Severity on nodes = icon + count (not colour-only). Worker off main thread. |
| **D3** | Radial graph layout | **M** | **Own PR.** Concentric rings by dependency depth; E-05 entry nucleus; expand/collapse rings; click re-centre; multi entry-point switcher; edge provenance (EXTRACTED solid / INFERRED dashed / unresolved dotted); severity-tinted nodes; full-screen canvas; collapsible filter drawer (not permanent wall); top floating bar (entry, search, fit); bottom status; inspector overlay. FE: `d3-hierarchy` radial cluster/tree **or** force + ring constraints; Vue Flow hosts custom positions. | Matches mock `#graph`. Rings readable at 1440×900. Drawer closed by default. Re-centre + entry switcher work. Provenance styles distinct. Reduced-motion snaps fit. “Sample data” removed when live. |
| **D4** | Report summary-first rebuild | **M** | Report opens on **Summary** (coverage %, severity counts with icons+labels, top findings). Skipped analysers / unresolved as **secondary** sections — not the first view. Split god `ScanReportPanel`; URL-synced filters; findings table; severity never colour-only; Export menu + toasts. Flat layout, full width. | Default tab = Summary. Skipped tables below fold / secondary. Empty/loading/error per tab. Cross-link to Graph. |
| **D5** | Open project + scan stepper | **M** | Segmented **Folder \| Zip \| Git URL**; per-source panels; drop zone; size limit up front; `ScanStepper` (Prepare → Upload → Queued → Analysing → Building report); cancel where API allows; full-width page. | Stepper reflects real phases; failure marks step + Retry; validation on blur; `aria-live` on progress. |
| **D6** | Projects list + summary + settings polish | **M** | Home = edge-to-edge **projects table** (not cards). Project summary = KPI **stats row** + tabs (Summary \| Report \| Graph \| Architecture \| Exports). Settings bare → usable dense form. Remove nested boxed cards / `SyntheticArchitectureDemo` from product. Past scans table with StatusPill. | Matches mock `#dashboard` / `#project`. Skeletons replace “…”. Raw errors behind Details. |
| **D7** | Landing hero fix | **S** | Two-column full-viewport hero; **working** mini radial sample (not empty / “+4 more” only). CTAs: amber primary + ghost secondary only — **no** blue-purple gradient buttons, no mustard/outline inconsistency. | Matches mock `#landing`. Sample graph draws rings + nodes. Button styles consistent. |

## Mapping from old plan

| Old | Status |
|---|---|
| PR1 tokens + shell | → **D1** (full-bleed rule added; primary = neutral) |
| PR2 fold viewer | → **D2** (radial deferred) |
| PR3 UI primitives | Fold into D1/D4/D5/D6 as needed; no separate gate |
| PR4 report rebuild | → **D4** (summary-first mandatory) |
| PR5 open + stepper | → **D5** |
| PR6 projects/summary/scans | → **D6** |
| PR7 workspaces | Include in D1 or small follow-up |
| PR8 sign-in restyle | Follow-up after D7 (product shell look) |
| PR9 ⌘K | Stub in D1; full palette follow-up |

## Out of scope until approval

Implementing Vue components, opening implementation PRs, pushing app changes, or changing `apps/web`. This plan is documentation only until mockups are approved.
