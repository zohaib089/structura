# Atlasmith visual direction

One-pass direction for mockup approval before FE work. Product: **Atlasmith** — local-first code-architecture tool (Vue 3, `apps/web`). Brand: hexagon navy + amber `BrandMark`.

**Hard rule:** every APP screen is **full width**. Slim sidebar (~220–240px) + fluid content. Content flush to edges with padding only (`--space-4/5/6`). No narrow centred containers. No nested boxed cards (no card-in-card).

---

## 1. Layout — full-bleed shell

```
┌─ Sidebar 220–240px ─┬─ Top bar 48px (breadcrumbs · ⌘K · actions) ─┐
│ BrandMark + name    │                                              │
│ Workspace switcher  ├─ Content: 100% remaining width               │
│ Projects / Open /   │  padding: space-4–6 only                     │
│ Settings            │  tables/rows edge-to-edge                    │
│ ─────────────────   │  graph: canvas fills viewport                │
│ User · theme        │                                              │
└─────────────────────┴──────────────────────────────────────────────┘
```

| Rule | Detail |
|---|---|
| Sidebar | Fixed 220–240px (icon-rail 56px when collapsed). Amber 2px left bar on active nav. |
| Top bar | 48px, hairline bottom border. Breadcrumbs left; ⌘K + primary action right. |
| Content | Fluid. **No** `max-width: 1280px` on app pages. Marketing landing may use a content measure; hero stays full viewport. |
| Graph | Full-screen canvas inside shell (minus top bar + optional tab strip). Filters = collapsible drawer, not a permanent wall. Inspector = overlay panel when a node is selected. |
| Dividers | 1px `--gray-4` hairlines. Prefer flat rows over cards. |

---

## 2. Type

| Token | Size / lh | Weight | Use |
|---|---|---|---|
| `--text-12` | 12 / 16 | 500 | Meta, table headers, badges |
| `--text-13` | 13 / 20 | 400 | Dense body, table cells, tree |
| `--text-14` | 14 / 20 | 400–500 | Default UI, inputs, buttons |
| `--text-16` | 16 / 24 | 600 | Section titles |
| `--text-20` | 20 / 28 | 600 | Page title |
| `--text-24` | 24 / 32 | 600 | Stat values |
| `--text-32` | 32 / 40 | 600 | Landing hero only |

- **UI:** Inter (system fallbacks OK in mockups).
- **Mono:** JetBrains Mono → `ui-monospace, SFMono-Regular, Menlo` for paths, rule IDs, hashes.
- Dense product: 12–14px default; display sizes reserved for landing / empty heroes.
- `font-variant-numeric: tabular-nums` on counts.

---

## 3. Colour

**Neutral first.** Amber is brand / selection only. Severity is semantic and never colour-only.

### Neutrals (dark-first; light mirrored)

| Token | Dark | Role |
|---|---|---|
| `--gray-0` | `#0b0d10` | Canvas |
| `--gray-1` | `#111317` | Sidebar / raised strip |
| `--gray-2` | `#181b20` | Inputs, overlays |
| `--gray-3` | `#1f2329` | Row hover |
| `--gray-4` | `#2a2f36` | Hairline borders |
| `--gray-5` | `#3a4049` | Strong borders |
| `--gray-7` | `#7d838c` | Muted |
| `--gray-8` | `#9ba1a9` | Secondary |
| `--gray-10` | `#e6e8eb` | Primary text |

### Brand & interaction

| Token | Value | Use |
|---|---|---|
| `--color-brand-amber-ui` | `#e0a040` | Active nav bar, selection ring, focus path, brand links. **Never** status. |
| BrandMark navy | `#12264a` | Logo fill only |
| **Primary button** | High-contrast **neutral**: fill `--gray-10`, text `--gray-0` (dark). Light: fill `#16181c`, text white. | Primary CTAs. **No** cyan/violet gradients. **No** blue “interactive accent” on product buttons. |
| Secondary / ghost | Border `--gray-5` or transparent + hover `--gray-3` | Secondary actions |
| Focus ring | `0 0 0 2px gray-0, 0 0 0 4px amber-ui` | Visible on any surface |

Retire in product UI: cyan `#69f0ff`, violet accents, glow shadows, gradient buttons.

### Severity (icon + label + colour — never colour alone)

| Severity | Icon | Dark fg |
|---|---|---|
| critical | octagon-alert | `#ff6b6b` |
| high | triangle-alert | `#ff9a5c` |
| medium | circle-alert | `#f5c84b` |
| low | info | `#6cb6ff` |
| info | circle-dot | `#a1a8b3` |

Tokens: `--sev-{level}-{fg|bg|border}` (full table retained in [dashboard-redesign.md](./dashboard-redesign.md)).

---

## 4. Motion

| Token | Value |
|---|---|
| `--dur-1` | 100ms hover |
| `--dur-2` | 160ms menus / tabs / drawer |
| `--dur-3` | 240ms dialog / inspector / ring expand |
| Easing | `cubic-bezier(.2, 0, 0, 1)` |

`prefers-reduced-motion: reduce` → durations 0; graph fit snap (no tween); no skeleton shimmer.

Graph: smooth zoom/pan; ring expand/collapse and re-centre use `--dur-3` (or snap when reduced).

---

## 5. Component look

| Pattern | Direction |
|---|---|
| Lists / projects | **Flat table rows**, 32px, sticky header, hairline dividers. Not card grids. |
| KPIs | Inline stats row (label + value), separated by hairlines — not four nested cards. |
| Buttons | Neutral primary; ghost secondary; amber only for brand/selection chrome. Sizes 28 / 32px. |
| Tabs | Underline, amber underline on selected, count badges. Full-width under top bar. |
| Filters | Drawer or chip bar — never a permanent left wall of checkboxes. |
| Cards | Avoid. If a surface is needed (dialog, empty state), one level only — no nesting. |
| Empty / loading | Skeleton matching final layout; EmptyState with one action. No “Refresh scans…” text-only. |

---

## 6. Gaps vs current UI (from screenshots + audit)

These are the problems this direction closes. (Screenshot PNGs not re-opened here; descriptions trusted.)

1. **Graph viewer (light):** Cramped column of tiny nodes; permanent left wall of filter checkboxes; thin header of outline buttons; empty right inspector; status “Showing 17 of 1,000 nodes” — reads as MVP, not a professional architecture tool.
2. **Landing (dark):** Hero sample graph empty/broken (only “+4 more” widget); left-aligned narrow content; inconsistent CTAs (gradient Launch / mustard Open sample / outline Copy); large dead space.
3. **Nested boxed cards** throughout dashboard — visual noise, not density.
4. **Inconsistent buttons** — cyan gradient vs mustard vs outline competing for primary.
5. **Report** opens on skipped-analyser tables instead of a summary-first overview.
6. **Projects / Settings** bare; no dense table home or polished settings.
7. **Graph on :8080** — separate app, lost shell/auth/back context.

---

## 7. Radial graph (new product signature)

Built around the hexagon brand: architecture as **concentric rings**, not a spaghetti force layout or cramped columns.

| Behaviour | Spec |
|---|---|
| Nucleus | Project entry point (E-05 detected, e.g. `main` / `index`) at centre. |
| Rings | Children by dependency depth (ring 1 = direct deps, ring 2 = …). |
| Interaction | Expand/collapse rings; click node → re-centre (that node becomes nucleus); multi entry-point switcher when several exist. |
| Edges | EXTRACTED = solid; INFERRED = dashed; unresolved = dotted. |
| Nodes | Severity tint (fg/border) + icon chip when findings exist; amber ring = selection. |
| Chrome | Full-screen canvas; collapsible filter drawer (closed by default / icon rail); top floating bar (entry switcher, search, fit); bottom status; right inspector overlay on select. |
| Label | Mockups mark “Sample data” until live scan wired. |

**FE note:** Prefer `d3-hierarchy` radial cluster/tree for deterministic rings, **or** a custom force with ring-radius constraints. Vue Flow can host custom node positions (bypass default layout). Ship as its **own PR** (see [fe-pr-plan.md](./fe-pr-plan.md) D3) after folding the viewer into the dashboard shell.

---

## 8. Screen intents (mock targets)

| Screen | Intent |
|---|---|
| Dashboard | Slim nav + edge-to-edge projects table + recent scans strip. |
| Project | Same shell; KPI stats row; tabs Summary \| Report \| Graph \| Architecture \| Exports. |
| Graph | Radial full-bleed canvas as above. |
| Report | Opens on **Summary** (coverage %, severity counts with icons, top findings). Skipped/unresolved secondary. |
| Open | Segmented Folder \| Zip \| Git URL + scan stepper, full width. |
| Landing | Two-column full-viewport hero; **working** mini radial sample; amber primary + ghost secondary only. |

---

## 9. Decisions locked for mockups

1. Full-bleed app shell — no content max-width, no nested cards.
2. Primary = high-contrast neutral (not cyan gradient, not blue accent).
3. Amber = brand / selection only; severity always icon + label + colour.
4. Graph signature = radial rings around entry-point nucleus.
5. Report summary-first; graph folded into dashboard (drop :8080) before radial PR.
