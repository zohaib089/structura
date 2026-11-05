# Atlasmith dashboard redesign — v2

**Status:** v2 (Nov 5). Supersedes the v1 audit @ `3e6f1d9`.  
**Companion:** [visual-direction.md](./visual-direction.md), [fe-pr-plan.md](./fe-pr-plan.md) (D1–D7). Interactive mockups (`mockups/index.html`) live with the design agent / approval package and are not in-repo yet.  
**Rule:** Mockups approved **before** any FE implementation.

v1 **PR6–PR9 are superseded** (see §6). Radial graph and full-bleed layout are first-class.

---

## 0. What changed in v2

| Topic | v1 | v2 |
|---|---|---|
| Content width | Sidebar + content max ~1280px (except graph/report) | **Every APP screen full-bleed**: slim sidebar + fluid content; padding only; **no** narrow centred containers; **no** nested boxed cards |
| Primary button | Blue `--accent` interactive | **High-contrast neutral** (`gray-10` on `gray-0` / inverse in light). Amber = brand/selection only. No cyan/violet gradients |
| Graph layout | Vue Flow overview inside shell | **Radial / concentric rings** around E-05 entry nucleus (own PR **D3**); fold viewer first (**D2**) |
| Report default | Overview among many tabs; skipped analysers prominent | **Summary first**: coverage, severity w/ icons, top findings; skipped/unresolved secondary |
| FE plan | PR1–PR9 | **D1–D7** in [fe-pr-plan.md](./fe-pr-plan.md) |
| Landing | Not deeply specified | Working mini radial sample; amber + ghost CTAs only |

---

## 1. Visual direction (lead)

See **[visual-direction.md](./visual-direction.md)** for the full one-pager. Summary:

- **Feel:** Professional local-first architecture tool (Linear / Sentry density), hexagon-branded, dark-first.
- **Shell:** Sidebar 220–240px + 48px top bar + edge-to-edge content.
- **Type:** Inter + JetBrains Mono; dense 12–32 scale (tables keep v1 §3.1).
- **Colour:** Neutral ramp first; amber selection; severity always **icon + label + colour**.
- **Components:** Flat rows, hairline dividers, underline tabs, drawer filters — not card-in-card.
- **Signature:** Radial dependency graph (nucleus + rings + provenance edge styles).

### Gaps closed (from screenshots + v1 audit)

1. Graph: cramped columns, permanent filter wall, empty inspector, “17 of 1,000” MVP feel → radial full-canvas + drawer + inspector overlay.  
2. Landing: broken/empty sample, narrow hero, inconsistent CTAs → working mini radial + amber/ghost only.  
3. Nested boxed cards → flat full-width rows.  
4. Inconsistent buttons / cyan gradients → neutral primary.  
5. Report opens on skipped tables → summary-first.  
6. Bare Projects/Settings → dense table + polished settings (D6).  
7. Graph on :8080 → folded into dashboard (D2).

---

## 2. Design system (tokens retained from v1)

Still land in `apps/web/src/styles/variables.css`. Contrast notes from v1 remain valid unless noted.

### 2.1 Type scale (unchanged)

| Token | Size / lh | Weight | Use |
|---|---|---|---|
| `--text-12` | 12 / 16 | 500 | Meta, badges, table headers |
| `--text-13` | 13 / 20 | 400 | Table cells, tree, dense body |
| `--text-14` | 14 / 20 | 400 / 500 | Default UI |
| `--text-16` | 16 / 24 | 600 | Section titles |
| `--text-20` | 20 / 28 | 600 | Page title |
| `--text-24` | 24 / 32 | 600 | Stat values |
| `--text-32` | 32 / 40 | 600 | Landing / rare empty heroes |
| `--font-family-mono` | JetBrains Mono, ui-monospace, … | 400 | Paths, IDs |

### 2.2 Neutral ramp (unchanged)

| Token | Dark | Light | Role |
|---|---|---|---|
| `--gray-0` | `#0b0d10` | `#ffffff` | Canvas |
| `--gray-1` | `#111317` | `#f7f8fa` | Sidebar |
| `--gray-2` | `#181b20` | `#ffffff` | Overlays, inputs |
| `--gray-3` | `#1f2329` | `#eef0f3` | Hover |
| `--gray-4` | `#2a2f36` | `#e2e5e9` | Hairlines |
| `--gray-5` | `#3a4049` | `#c9ced5` | Strong borders |
| `--gray-7` | `#7d838c` | `#6b717b` | Muted |
| `--gray-8` | `#9ba1a9` | `#5b616b` | Secondary |
| `--gray-10` | `#e6e8eb` | `#16181c` | Primary text |

### 2.3 Brand & primary (**updated**)

| Token | Dark | Light | Notes |
|---|---|---|---|
| `--color-brand-amber-ui` | `#e0a040` | `#9a5b00` | Selection, active nav, focus path. Never status. |
| BrandMark navy | `#12264a` | — | Logo fill only |
| **Primary button** | fill `--gray-10`, text `--gray-0` | fill `#16181c`, text `#fff` | High-contrast neutral. **Replaces** v1 blue `--accent` for product CTAs. |
| Ghost / secondary | border `--gray-5` | same | |
| `--focus-ring` | double ring using amber-ui | same | Visible on any surface |
| Status success / failed / queued | as v1 §3.3 | | Running may use amber pulse (not cyan) |

**Retired in product UI:** cyan `#69f0ff`, violet accents, glow, gradient buttons. Landing uses amber primary + ghost only (no blue-purple gradient).

*Open question from v1 Q3 resolved for v2 mockups:* single brand accent (amber) + neutral primary; low severity stays blue-tinted but always with icon — not a button colour.

### 2.4 Severity (unchanged table)

Icon + label + colour. Tokens `--sev-{critical|high|medium|low|info}-{fg|bg|border}`.

| Severity | Icon | Dark fg / bg / border | Light fg / bg / border |
|---|---|---|---|
| critical | octagon-alert | `#ff6b6b` / `#2a1215` / `#5c2328` | `#b4232c` / `#fdecec` / `#f4b8bb` |
| high | triangle-alert | `#ff9a5c` / `#2a1a10` / `#5c3520` | `#b04a0c` / `#fdf0e6` / `#f2c4a2` |
| medium | circle-alert | `#f5c84b` / `#262010` / `#574a1f` | `#8a6300` / `#fdf6e0` / `#ead491` |
| low | info | `#6cb6ff` / `#0f1d2e` / `#21406a` | `#1f5fae` / `#e9f2fd` / `#b4cff2` |
| info | circle-dot | `#a1a8b3` / `#1a1d22` / `#353a42` | `#555d68` / `#f1f3f5` / `#d3d7dc` |

`scan-report-severity.ts` must map critical ≠ high (v1 bug).

### 2.5 Spacing, radii, motion (**layout updated**)

| Group | Tokens |
|---|---|
| Spacing | `--space-1…16`; product uses 1–6, 8, 12. Content padding `--space-4/5/6` only. |
| Radii | `--r-xs 4` · `--r-sm 6` · `--r-md 8` · `--r-lg 12` · `--r-full` |
| Elevation | Prefer hairline borders in dark; `--elev-2/3` for menus/dialogs/overlays only — **not** for nesting cards in content |
| Motion | `--dur-1 100` · `--dur-2 160` · `--dur-3 240`; easing `.2,0,0,1`; reduced-motion → 0 |
| **Layout** | Sidebar **220–240px** (collapse 56); top **48px**; content **fluid full width** (no 1280 max on app); graph inspector ~280–360 overlay; filter **drawer** not permanent rail |

### 2.6 Components (delta from v1)

Keep v1 §3.6 primitives (Button, Table, Tabs, SeverityPill, ScanStepper, Toast, EmptyState, Skeleton, ErrorBanner, CommandPalette). Deltas:

- **Card:** discouraged in app content; one surface max if needed (dialog / empty).  
- **Stat:** inline stats **row** with hairline separators, not four nested cards.  
- **AppShell:** full-bleed; projects = table.  
- **Graph chrome:** floating top bar + collapsible drawer + inspector overlay (see §5).

State matrix (loading / empty / error) from v1 §3.7 still applies.

---

## 3. Routes (unchanged intent)

| Route | Screen |
|---|---|
| `/auth/:view` | Sign-in |
| `/w/:workspace` | Projects list (home) |
| `/w/:workspace/new` | Open project |
| `/w/:workspace/projects/:projectId` | Project summary + tabs |
| `/w/:workspace/projects/:projectId/scans/:scanId/:tab?` | Report (default **summary**) / graph |

`/dashboard` → last workspace redirect.

---

## 4. Screen deltas vs v1

| Screen | v2 requirement |
|---|---|
| Projects | Edge-to-edge table + recent scans strip (mock `#dashboard`) |
| Project | KPI row + tabs Summary \| Report \| Graph \| Architecture \| Exports (mock `#project`) |
| Open | Segmented Folder \| Zip \| Git + stepper full width (mock `#open`) |
| Report | **Summary first**; skipped/unresolved secondary (mock `#report`) |
| Graph | Radial; drawer filters; fold :8080 (mocks `#graph`; FE D2 then D3) |
| Landing | Two-column hero; working mini radial; amber + ghost (mock `#landing`) |
| Auth / workspaces / ⌘K | Still needed; follow D1 + later polish (v1 PR7–PR9 → follow-ups) |

Per-area audit findings in v1 §1 remain the evidence base.

---

## 5. Graph — radial direction

### 5.1 Wiring (from v1, still required)

Fold viewer into dashboard (**D2**): same origin, scan API data, drop storage handoff and compose **:8080**. Optionally keep public `/viewer` for landing sample only.

### 5.2 Radial layout (**new**)

- Nucleus = E-05 entry (e.g. `main` / `index`); multi entry-point switcher.  
- Concentric rings by dependency depth; expand/collapse; click node → re-centre.  
- Edges: EXTRACTED solid / INFERRED dashed / unresolved dotted.  
- Nodes: severity tint + icon when findings; amber = selection / focus path.  
- Chrome: full-screen canvas; filter drawer (default closed); floating top bar; bottom status; inspector overlay.  
- FE: `d3-hierarchy` radial **or** force + ring constraints; Vue Flow custom positions. **Own PR D3.**

Severity treatment and deep links from v1 §5.3–5.4 still apply after radial lands.

---

## 6. PR plan — D1–D7 (supersedes PR6–PR9)

Full table: **[fe-pr-plan.md](./fe-pr-plan.md)**.

| # | Title | Size |
|---|---|---|
| D1 | Tokens + full-bleed app shell | M |
| D2 | Fold viewer into dashboard (Graph tab; keep overview temporarily) | M |
| D3 | **Radial graph layout (own PR)** | M |
| D4 | Report summary-first rebuild | M |
| D5 | Open project + scan stepper | M |
| D6 | Projects list + summary + settings polish | M |
| D7 | Landing hero fix | S |

| v1 PR | v2 |
|---|---|
| PR1 | → D1 (full-bleed + neutral primary) |
| PR2 | → D2 (radial split to D3) |
| PR3 | Fold into D1/D4–D6 |
| PR4 | → D4 |
| PR5 | → D5 |
| **PR6–PR9** | **Superseded** → D6 + follow-ups (workspaces, auth, full ⌘K) |

---

## 7. Open questions (updated)

1. Keep public `/viewer` for landing sample JSON drop, or embed sample only?  
2. Scan API cancel + step-level progress fidelity for stepper?  
3. Export formats required (JSON, Markdown, CSV, SARIF)?  
4. ~~Blue interactive accent vs amber~~ → **resolved in v2:** neutral primary + amber brand.  
5. `SyntheticArchitectureDemo` → marketing only (yes for product views).

---

## 8. Docs note

This v2 spec lives at `docs/design/dashboard-redesign.md`. Companions: [visual-direction.md](./visual-direction.md) and [fe-pr-plan.md](./fe-pr-plan.md). Do not implement UI in the docs PR.

Interactive mockups (including `mockups/index.html`) live with the design agent / approval package and are not in-repo yet.
