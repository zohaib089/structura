# Atlasmith dashboard redesign spec

Source audited: `zohaib089/structura` @ `3e6f1d9` (main), `apps/web` (Vue 3 + Vite + Vue Flow). Read-only audit, one pass.
Scope: sign-in, workspaces, Open project, scan progress, past scans, project summary, interactive report, graph view.

---

## 1. Audit summary

### 1.1 Top 10 problems (ranked)

| # | Problem | Evidence |
|---|---|---|
| 1 | The graph is a separate app. The dashboard stages the graph in storage and links out to `/viewer/`. In docker, that is a separate `viewer` service on **:8080**, so context, auth and the back button are lost. | `components/dashboard/DashboardGraphPanel.vue` (`viewerHref`, `stageGraphForViewer`), `services/viewer-link.ts`, `services/viewer-graph-handoff.ts`, `viewer/main.ts`, `viewer/ViewerApp.vue`, `docker-compose.yml` (`viewer`, `8080:80`, Dockerfile target `viewer`) |
| 2 | No app shell. `/dashboard` is one long route with no sidebar, breadcrumbs, per-project URL or ⌘K. Projects, scans and reports can't be deep-linked. | `router/index.ts` (only `/dashboard`, `/auth`), `views/DashboardView.vue` (1012 lines) |
| 3 | God components. Layout, data fetching, polling and styles are mixed together, which makes it hard to apply a consistent system. | `DashboardView.vue` 1012 lines, `ScanReportPanel.vue` 688, `AuthView.vue` 745, `DashboardGraphPanel.vue` 415 |
| 4 | Severity mapping is lossy and colour-only. Critical and high both map to `--color-danger`, and info falls back to the cyan accent. There are no per-severity bg/border tokens, and no guaranteed icon or label. | `services/scan-report-severity.ts` (`severityCssVar`), tree and graph nodes in `ScanReportTree.vue`, `ScanReportHierarchyGraph.vue` |
| 5 | Two competing accent systems: marketing cyan `#69f0ff` and violet in `--color-accent-*`, plus brand amber and navy appended as "additive" tokens. The dashboard still uses cyan for interaction, so it has no single accent. | `styles/variables.css` lines 1–140 vs 178+; `design-system.md` "cyan primary, violet secondary" |
| 6 | Marketing-scale type and radii in the product UI: radii from 8 to 28px, sizes up to 72px, display tracking. There is no 12/13px dense step for tables and paths, and no mono font token. | `variables.css` (`--radius-sm` is 0.5rem, `--font-size-*`, no `--font-family-mono`) |
| 7 | Loading states are bare text ("Refresh scans…"). Dashboard panels have no skeletons, empty states are inconsistent, and errors are a red `<p>` with no retry. | `ScanListPanel.vue` L38–39, `OpenProjectPanel.vue` (string `error` ref), `grep skeleton components/dashboard`, which finds nothing. The viewer has `LoadingSkeleton.vue` and `ErrorBanner.vue` that are not shared. |
| 8 | Scan progress is a 4-value `phase` (`idle/zipping/uploading/polling`) with no stepper, percentage, elapsed time or cancel. The three source types (folder, zip, git URL) are handled in one panel with one error string. | `OpenProjectPanel.vue` L30–135, `services/scan-poll.ts` |
| 9 | Report tabs are custom. The report tablist uses `role=tab`, but the main 7 report tabs (History, Violations, Security, Bad practices, Improvements, Removals, Architecture) have to be checked for `tablist`, arrow-key support and `aria-controls`. Pagination is client-side with a fixed `PAGE_SIZE` and no sticky header or column sort. | `ScanReportPanel.vue` L60–150, L272–276 |
| 10 | Inconsistent focus and theme handling. `design-system.md` asks for `--focus-ring` everywhere, but that token is cyan at 32% alpha, which is weak on light surfaces. The light theme uses translucent borders (`rgba(15,23,42,.09)`), which are too faint for table rules. | `variables.css` `--focus-ring`, light `--color-border` |

### 1.2 Per-area findings

| Area | Files | Findings |
|---|---|---|
| Sign-in | `views/AuthView.vue`, `components/auth/AuthShell.vue`, `AuthField.vue`, `services/auth.ts` | 745-line view with marketing styling (glow, large radii). There is no BrandMark lock-up in the card header. Field errors need `aria-describedby` and `aria-invalid` (verify in AuthField). There is no loading state on submit beyond disabling the button. Copy and layout should match the product shell, not the landing page. |
| Workspaces | `services/workspaces.ts`, `DashboardView.vue` | The workspace switcher is inline in the dashboard and has no sidebar home. There is no create/rename UI pattern, no empty state ("No workspaces yet"), and the current workspace is not in the URL. |
| Open project | `components/dashboard/OpenProjectPanel.vue`, `services/folder-zip.ts`, `upload-archive.ts`, `git-remote-url.ts` | Folder, .zip and git link share one form and one `error` string. Validation messages (`invalidGithubUrl`, `zipUploadTooLarge`) only appear after submit, and the size limit isn't shown up front. There is no drop-zone affordance or keyboard alternative text. Progress is a phase label only, with no steps, cancel or elapsed time. |
| Past scans | `ScanListPanel.vue`, `DashboardScansHub.vue`, `api/scans.ts` | The list is not a table: no columns, sort or status pill. Loading is the text "Refresh scans…". Failed scans show a raw `errorMessage` inline. The empty state is not designed. Refresh is a manual button with no "last updated" time. |
| Project summary | `DashboardView.vue`, `services/dashboard-graph-stats.ts` | Stats are not a reusable Stat component. There is no severity breakdown bar, and hierarchy competes with the open-project panel on the same page. `SyntheticArchitectureDemo.vue` (demo art) sits in the product view. Decide whether it belongs there (it could be marketing-only). |
| Report: tabs and filters | `ScanReportPanel.vue`, `services/scan-report-filters.ts`, `scan-report-messages.ts` | 7 tabs plus filters in one 688-line file. Filters aren't reflected in the URL. Counts appear only on the Architecture tab label. The other tabs should show counts too. Pagination has no page-size control. |
| Report: tree and nodes | `ScanReportTree.vue`, `ScanReportHierarchyGraph.vue`, `ScanReportModuleGraph.vue`, `services/scan-report-tree.ts`, `scan-report-severity.ts` | Severity on folder and file nodes is colour-only, and critical and high look the same. Paths aren't in a mono font. There is no truncate-middle for long paths. The tree/graph toggle is a `role=tablist` (good), but the two hierarchy renderers duplicate the viewer's Vue Flow canvas. |
| Report: Architecture | `ScanReportArchitecturePanel.vue`, `services/scan-report-architecture.ts`, `ScanReportAnalysers.vue` | A small panel (127 lines) with no empty state for "no architecture rules configured" vs "0 violations". Analyser status needs a status pill. |
| Report: export | `services/scan-report-export.ts` | Export has no format menu, no success toast tied to the shared toast, and no disabled/loading state during generation. |
| Toast | `DashboardToast.vue` | A single-purpose toast with no variants (success/error/info), no `aria-live` region contract, no action slot and no queue. |
| Graph viewer | `src/viewer/*` (ViewerApp, GraphCanvas, FilterRail, NodeDetail, SearchPalette, ErrorBanner, LoadingSkeleton, CoachMark, ZoomPad, GraphLegend), `viewer/viewer-base.css` | A well-built separate entry with its own base CSS and the `--graph-*` tokens (variables.css 178+). It has good primitives (ErrorBanner, LoadingSkeleton, SearchPalette) that the dashboard should reuse. Wiring: the dashboard calls `stageGraphForViewer(text)`, then opens `viewerHref()` (`${BASE_URL}viewer/`), and `ViewerApp` calls `consumeStagedViewerGraph()`. In compose it is served by a separate nginx target on :8080. |

---

## 2. Design direction

- **Feel:** a professional dev tool comparable to Linear, Vercel or Sentry. Dense but calm, mostly neutral greys, with colour reserved for meaning (severity, status) and one interactive accent.
- **Brand:** the hexagon `BrandMark.vue` sits at 20px in the sidebar header next to the product name from `brand.ts`, with no other ornament. Amber (`--color-brand-amber-ui`) means identity and "what you are following" (selection, focus path, current nav item indicator). It is **never** used for status.
- **Interactive accent:** one blue used for primary buttons, links and focus. This is a new interactive token, not a brand colour.
- **Retire in product UI:** the cyan and violet accents, glow shadows and gradients. Keep them for the landing page only, or re-point them later.
- **Dark mode first-class:** both themes are designed and tested. `data-theme` on `<html>` stays the mechanism (`stores/theme.ts`).
- **Type:** Inter for UI, and `JetBrains Mono` (fallback `ui-monospace, SFMono-Regular, Menlo`) for paths, rule IDs, hashes and code.
- **Density:** 32px rows in tables, 13px body in data views, 14px in forms and prose.

---

## 3. Design system

All tokens go in `apps/web/src/styles/variables.css`. Product tokens use the prefix `--ds-*` (or overwrite the existing semantic names in PR1, see Q2). Contrast was computed with a WCAG 2.1 relative-luminance script.

### 3.1 Type scale

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `--text-12` | 12 / 16 | 500 | Meta, badges, table headers (uppercase off) |
| `--text-13` | 13 / 20 | 400 | Table cells, tree rows, dense body, paths (mono) |
| `--text-14` | 14 / 20 | 400 / 500 | Default UI body, inputs, buttons |
| `--text-16` | 16 / 24 | 600 | Section titles, card titles |
| `--text-20` | 20 / 28 | 600 | Page title |
| `--text-24` | 24 / 32 | 600 | Stat values, auth heading |
| `--text-32` | 32 / 40 | 600 | Rare: empty-state hero numbers |
| `--font-family-mono` | `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace` | 400 | Paths, IDs |

Tracking: -0.01em at 20px and above, otherwise 0. Use `font-variant-numeric: tabular-nums` for counts and tables.

### 3.2 Neutral ramp

| Token | Dark | Light | Role |
|---|---|---|---|
| `--gray-0` canvas | `#0b0d10` | `#ffffff` | App background |
| `--gray-1` surface | `#111317` | `#f7f8fa` | Sidebar, cards |
| `--gray-2` raised | `#181b20` | `#ffffff` | Popovers, dialogs, inputs |
| `--gray-3` hover | `#1f2329` | `#eef0f3` | Row hover, ghost hover |
| `--gray-4` border | `#2a2f36` | `#e2e5e9` | Default border, table rules (solid, not alpha) |
| `--gray-5` border-strong | `#3a4049` | `#c9ced5` | Inputs, focusable outlines |
| `--gray-7` text-muted | `#7d838c` | `#6b717b` | Placeholders, meta |
| `--gray-8` text-secondary | `#9ba1a9` | `#5b616b` | Secondary text |
| `--gray-10` text-primary | `#e6e8eb` | `#16181c` | Primary text |

| Pair | Ratio |
|---|---|
| text-primary on canvas (dark) | 15.85:1 |
| text-secondary on surface (dark) | 7.14:1 |
| text-muted on surface (dark) | 4.87:1 (AA) |
| text-primary on white | 17.77:1 |
| text-secondary on white | 6.24:1 |
| text-muted on surface (light) | 4.62:1 (AA) |

### 3.3 Accent and status

| Token | Dark | Light | Notes |
|---|---|---|---|
| `--color-brand-amber-ui` (existing) | `#e0a040` | `#9a5b00` (existing) | Selection ring, focus path, active nav bar, brand links. 8.21:1 on dark surface. Text on amber fill uses `--gray-0` (8.59:1). |
| `--color-brand-mark` / `-mark-accent` (existing) | existing | existing | BrandMark only |
| `--color-brand-navy` (existing) | `#12264a` | — | Fill only (auth side panel art). Never text. |
| `--accent` (new, interactive) | `#5b9dff` | `#2563eb` | Links, primary button, focus. 6.83:1 on dark surface, 5.17:1 on white. White on `#2563eb` is 5.17:1. On dark, the primary button uses `#2563eb` with white text. |
| `--accent-hover` | `#7ab0ff` | `#1d4ed8` | |
| `--focus-ring` (replace) | `0 0 0 2px var(--gray-0), 0 0 0 4px var(--accent)` | same | Double ring, visible on any surface |
| `--status-success` | `#3fb950` | `#1a7f37` | Scan done |
| `--status-running` | `--accent` | `--accent` | Scan running |
| `--status-failed` | = critical fg | = critical fg | |
| `--status-queued` | `--gray-8` | `--gray-8` | |

### 3.4 Severity tokens

Every severity is shown with an **icon, a text label and colour**. Colour is never used alone. Node chips show the icon plus a count. Pills show the icon plus the label.

| Severity | Icon (lucide) | Label | Dark fg / bg / border | Light fg / bg / border |
|---|---|---|---|---|
| critical | `octagon-alert` | Critical | `#ff6b6b` / `#2a1215` / `#5c2328` | `#b4232c` / `#fdecec` / `#f4b8bb` |
| high | `triangle-alert` | High | `#ff9a5c` / `#2a1a10` / `#5c3520` | `#b04a0c` / `#fdf0e6` / `#f2c4a2` |
| medium | `circle-alert` | Medium | `#f5c84b` / `#262010` / `#574a1f` | `#8a6300` / `#fdf6e0` / `#ead491` |
| low | `info` (circle) | Low | `#6cb6ff` / `#0f1d2e` / `#21406a` | `#1f5fae` / `#e9f2fd` / `#b4cff2` |
| info | `circle-dot` | Info | `#a1a8b3` / `#1a1d22` / `#353a42` | `#555d68` / `#f1f3f5` / `#d3d7dc` |

Token names: `--sev-{critical|high|medium|low|info}-{fg|bg|border}`.

Computed contrast (fg vs own bg / vs surface / vs canvas):

| Severity | Dark | Light |
|---|---|---|
| critical | 6.33 / 6.70 / 7.01 | 5.71 / 6.53 / 6.14 |
| high | 8.00 / 8.88 / 9.29 | 4.90 / 5.48 / 5.16 |
| medium | 10.22 / 11.73 / 12.27 | 5.03 / 5.43 / 5.11 |
| low | 7.91 / 8.65 / 9.05 | 5.62 / 6.35 / 5.98 |
| info | 7.05 / 7.76 / 8.12 | 5.99 / 6.66 / 6.27 |

All pass AA for text (≥4.5:1). Borders are decorative: the fg-coloured icon carries the ≥3:1 graphic contrast. Low severity uses blue, which is close to `--accent`. To keep it distinct, low is never a button and always carries its icon (see Q3). `scan-report-severity.ts#severityCssVar` must return `--sev-*-fg`, with a 1:1 mapping (critical ≠ high).

### 3.5 Spacing, radii, elevation, motion

| Group | Tokens |
|---|---|
| Spacing (4px) | Keep `--space-1…--space-16`. Product UI uses 1, 2, 3, 4, 5, 6, 8, 12. |
| Radii | `--r-xs 4px` (badges, chips), `--r-sm 6px` (buttons, inputs), `--r-md 8px` (cards, menus), `--r-lg 12px` (dialogs), `--r-full`. The marketing radii stay for the landing page. |
| Elevation | `--elev-0` none plus border, `--elev-1 0 1px 2px rgb(0 0 0 / .2)` (cards in light), `--elev-2 0 4px 12px rgb(0 0 0 / .24)` (menus), `--elev-3 0 16px 48px rgb(0 0 0 / .4)` (dialogs, ⌘K). In dark, surfaces are separated by the grey steps plus a 1px border, and shadows are subtle. |
| Motion | `--dur-1 100ms` (hover), `--dur-2 160ms` (menus, tabs), `--dur-3 240ms` (dialog, inspector slide). Easing `cubic-bezier(.2,0,0,1)`. `@media (prefers-reduced-motion: reduce)` sets all durations to 0ms, turns off graph fit animation (`viewer/motion.ts` already has a hook) and stops skeleton shimmer (static fill instead). |
| Layout | Sidebar 240px (collapsible to 56px), top bar 48px, content max 1280px except graph and report (fluid), inspector 360px. |

### 3.6 Core components

New folder: `apps/web/src/components/ui/`. Promote the viewer's `ErrorBanner`, `LoadingSkeleton` and `SearchPalette` into it.

| Component | Spec |
|---|---|
| AppShell | Sidebar has BrandMark and product name, a workspace switcher (menu), nav (Projects, Scans, Settings), and the user menu plus theme toggle at the bottom. The active item gets a 2px amber left bar and `--gray-3` bg. Top bar (48px) has breadcrumbs (`Workspace / Project / Scan #id / Tab`), a ⌘K button showing the shortcut hint, and the primary action slot. Include a skip-to-content link. |
| CommandPalette (⌘K) | Built from `viewer/components/SearchPalette.vue`. Groups: Projects, Scans, Files (in report), Actions (Open project, Toggle theme). Full keyboard support, `role=dialog` plus combobox ARIA. |
| Button | Variants: primary (accent), secondary (gray-2 with border), ghost, danger. Sizes: sm 28px and md 32px. Loading state shows a spinner and keeps the width. `:focus-visible` uses `--focus-ring`. |
| Input / Textarea | 32px tall, `--gray-5` border, accent border on focus, error border = critical fg plus a message linked with `aria-describedby`, and helper text below. |
| Select / Menu | Native `<select>` for simple cases. A listbox menu for the workspace switcher and filters. |
| Tabs | Underline style, 13/500, with a count badge per tab. `role=tablist`, roving tabindex with arrow keys, and `aria-controls`. The selected tab gets an amber underline. |
| Table | 32px rows, sticky header, sortable headers (`aria-sort`), mono path column with middle truncation and full path in a tooltip, row hover, row selected (amber 2px left inset), and server or client pagination with a page-size select. |
| Badge / SeverityPill | Pill radius `--r-xs`, 12/500, `--sev-*` bg, border and fg, icon plus label. A compact chip variant (icon plus count) for nodes and tree rows. |
| StatusPill | Queued, Running (pulsing dot, static when reduced motion is on), Done, Failed. |
| Card | `--gray-1`, 1px border, `--r-md`, padding `--space-4`, optional header row with title and actions. |
| Stat | Label (12, muted), value (24/600, tabular), optional delta or sub-label. No invented trends. Only show deltas that the API supplies. |
| SeverityBar | Stacked horizontal bar split by severity, with a legend that pairs each severity's icon, label and count. |
| ScanStepper | Steps: Prepare (zip, folder only), Upload, Queued, Analysing, Building report. Each has a state (pending, active, done, error), elapsed time, a Cancel button (where the API allows) and `aria-live=polite` text. |
| Toast | Replaces `DashboardToast.vue`. Variants: success, error, info. Optional action, auto-dismiss after 5s (errors stay until dismissed), stacked bottom-right, one `aria-live` region. |
| Dialog | `--r-lg`, `--elev-3`, focus trap, Esc to close, returns focus to the trigger. |
| EmptyState | Icon (24px, muted), title (16/600), one line of body, primary action. |
| Skeleton | Matches the final layout (table rows, stat tiles, tree rows). Shimmer is turned off when reduced motion is on. |
| ErrorBanner | Inline, critical-tinted. Shows a message, a "Retry" action and a collapsible "Details" section with the raw error in mono. Generalised from `viewer/components/ErrorBanner.vue`. |

### 3.7 State matrix (every data view)

| State | Pattern |
|---|---|
| Loading (first) | Skeleton in the final layout. Never text-only "…". |
| Loading (refresh) | Keep the data and show a small spinner in the card header with "Updated hh:mm". |
| Empty | EmptyState with a single action. |
| Empty (filtered) | "No findings match these filters" plus "Clear filters". |
| Error | ErrorBanner with Retry. Partial data stays visible if available. |
| Not found / no access | Full-page EmptyState plus a "Back to projects" link. |

---

## 4. Screen-by-screen

Proposed routes (all under `/:locale`):

| Route | Screen |
|---|---|
| `/auth/:view` | Sign-in / sign-up |
| `/w/:workspace` | Projects list (home) |
| `/w/:workspace/new` | Open project |
| `/w/:workspace/projects/:projectId` | Project summary |
| `/w/:workspace/projects/:projectId/scans` | Past scans |
| `/w/:workspace/projects/:projectId/scans/:scanId/:tab?` | Report (tabs, including `graph`) |

Keep `/dashboard` as a redirect to the last workspace.

### 4.1 Sign-in (`AuthView.vue`, `AuthShell.vue`, `AuthField.vue`)

| Aspect | Change |
|---|---|
| Layout | A centred 400px card on `--gray-0`. BrandMark (32px) plus product name above the card. Optional navy brand panel on the left at ≥980px (fill only). |
| Components | Input, Button (primary, full width, loading), inline ErrorBanner for auth failures, link-style secondary actions. |
| States | Submitting: button spinner, fields stay enabled but submit is blocked. Error: banner above the form, field-level `aria-invalid`. Session expired: info banner "Your session expired. Sign in again." |
| Copy | Title "Sign in to {productName}". Errors should be specific ("Email or password is incorrect"). Don't expose raw server messages. |
| Cleanup | Remove glow and marketing gradients. Split the 745-line view into form components. |

### 4.2 Workspaces

| Aspect | Change |
|---|---|
| Layout | Switcher in the sidebar header, below the brand: the current workspace name plus a chevron. The menu lists workspaces and has a "Create workspace" option. |
| States | Empty: a full-page EmptyState "Create your first workspace" with a name input. Loading: a skeleton line in the switcher. Error: an ErrorBanner in the menu. |
| URL | The workspace slug or ID is in the route. Switching navigates. |

### 4.3 Projects list (new home)

| Aspect | Change |
|---|---|
| Layout | Page title "Projects", with the primary action "Open project" (also in ⌘K). Table columns: Name, Source (folder/zip/GitHub/GitLab icon plus mono remote), Last scan (StatusPill plus relative time), Findings (SeverityBar mini), Updated. |
| States | Empty: "No projects yet". Body: "Open a folder, upload a .zip, or paste a GitHub or GitLab link to run your first scan." Action: Open project. Loading: 5 skeleton rows. Error: banner plus retry. |

### 4.4 Open project (`OpenProjectPanel.vue`)

| Aspect | Change |
|---|---|
| Layout | A page or dialog with a 3-option segmented control: **Folder**, **.zip**, **Git link**. Each has its own panel. Folder and zip use a drop zone (dashed `--gray-5` border, keyboard "Browse" button, max size from config shown up front). Git link uses a URL input with live validation (GitHub/GitLab detected and icon shown) and optional branch. |
| Progress | ScanStepper replaces the `phase` text. On success, toast "Scan complete" with the action "View report", and auto-navigate to the report. On failure, the stepper marks the failed step and an ErrorBanner offers Retry plus details. |
| States | Validation is per-field and shown on blur. Zip too large: show the limit and actual size. Invalid URL: "Enter a GitHub or GitLab repository URL, for example https://github.com/org/repo". |
| Split | `OpenFolderSource.vue`, `OpenZipSource.vue`, `OpenGitSource.vue` plus `useScanRun()` composable (wraps `scan-poll.ts`). |

### 4.5 Past scans (`ScanListPanel.vue`, `DashboardScansHub.vue`)

| Aspect | Change |
|---|---|
| Layout | Table columns: Scan (#id, mono), Status (StatusPill), Source / commit (mono, truncated), Started, Duration, Findings (severity chips). Clicking a row opens the report. |
| States | Loading: skeleton rows. Refresh: header spinner plus "Updated hh:mm", and running scans auto-poll. Failed scans: a StatusPill with a "View error" disclosure. Raw errors are not shown inline in the row. Empty: "No scans for this project yet", action "Run scan". |

### 4.6 Project summary (`DashboardView.vue`)

| Aspect | Change |
|---|---|
| Layout | Header with project name, source and "Run scan" / "Open graph". A row of 4 Stat tiles: Files analysed, Findings, Architecture violations, Last scan. Only use values the API provides. Then a SeverityBar card, a "Top folders by findings" table (links to the report tree filter) and a "Recent scans" (5) card. |
| Remove | `SyntheticArchitectureDemo.vue` from the product view (see Q4). |
| States | No scans yet: an EmptyState with Run scan. Latest scan running: inline ScanStepper card. |

### 4.7 Interactive report (`ScanReportPanel.vue` and children)

| Aspect | Change |
|---|---|
| Layout | Sticky sub-header: scan meta (id, commit, date), Export menu, then Tabs. Tabs: Overview, Violations, Security, Bad practices, Improvements, Removals, Architecture, **Graph**, History. Every tab gets a count. Body layout is a 280px left tree (folders and files with severity chips) plus the main findings table. Selecting a tree node filters the table. |
| Filters | A bar above the table: severity multi-select (pills with icon and label), analyser, path search (mono), "Clear". All state goes in the query string (`?sev=critical,high&path=src/api`). |
| Nodes | Folder rows show their highest severity as an icon chip plus a count. File rows show a chip with count per severity (max 2 shown, plus "+n"). Never just a coloured dot. |
| Findings table | Columns: Severity (pill), Rule (mono ID plus title), Path:line (mono, middle-truncated), Analyser. Expanding a row shows the message, a code snippet if available, and "Show in graph". |
| Architecture tab | Distinguish "No architecture rules configured" (EmptyState plus docs link) from "No violations" (success empty state). Violations table: Rule, From → To (mono), Count. Analysers (`ScanReportAnalysers.vue`) shown as a status list with StatusPill. |
| Export | A menu with the formats `scan-report-export.ts` supports. A loading state on the item, and success/error toasts. |
| States | Report loading: skeleton tree plus table. Empty tab: "No {tab} findings in this scan". Filtered empty: "Clear filters". Parse error (`scan-report-parse.ts`): ErrorBanner with details. |
| Split | `ReportHeader`, `ReportTabs`, `ReportFilters`, `FindingsTable`, `ReportTree` (from `ScanReportTree.vue`). Retire `ScanReportHierarchyGraph.vue` and `ScanReportModuleGraph.vue` in favour of the Graph tab (§5). |

### 4.8 Copy fixes (global)

| Current pattern | Fix |
|---|---|
| "Refresh scans…" as a loading message | Skeleton, plus a "Refresh" button label |
| Raw `cause.message` shown to the user | Friendly sentence plus "Details" disclosure |
| Mixed "Structura" and "Atlasmith" | Always use the `brand.ts` constant in UI strings. Audit the `*-messages.ts` files. |
| Generic "Scan failed" | "Scan failed at {step}. {reason}" with Retry |

---

## 5. Graph inside the dashboard

### 5.1 Wiring today, and the target

| Today | Target |
|---|---|
| The dashboard calls `stageGraphForViewer(text)` (storage handoff), then `viewerHref()` links to `${BASE}viewer/`, a separate entry (`viewer/main.ts`, `ViewerApp.vue`) served by the docker `viewer` target on **:8080** | The route `/w/:ws/projects/:pid/scans/:sid/graph` lazy-loads `GraphView.vue` inside AppShell. Graph data comes from the scan API (same fetch as the report), with no storage handoff. |
| `viewer-base.css` is a separate base | Viewer components consume the shared `--ds-*`/`--sev-*` tokens. Delete `viewer-base.css` after migration. |
| The worker (`graph.worker.ts`, `parse-client.ts`) runs per app | Reuse it as is, imported from the dashboard chunk (Vite worker import). |

Keep the standalone viewer build only if the public "drop a JSON file" sample is still wanted (see Q1). If kept, it should be the same component mounted on a public route (`/viewer`), not a separate compose service.

### 5.2 Layout

```
┌ Sidebar ┬ Top bar: Workspace / Project / Scan #42 / Graph        ⌘K ┐
│         ├ Report tabs (… Architecture | Graph | History)            │
│         ├ FilterRail 240 │ Canvas (full height, Vue Flow) │ Inspector 360 │
│         │  severity      │  FocusBar (top), ZoomPad (BR), │ NodeDetail:  │
│         │  analyser      │  GraphLegend (BL), BudgetMeter │ path, counts,│
│         │  layers        │                                │ findings list│
└─────────┴────────────────────────────────────────────────────────────┘
```

- The canvas fills the viewport height minus the shell (`calc(100dvh - 48px - tabs)`). The rails collapse at <1280px, and the inspector becomes a bottom sheet at <980px.
- Reuse `GraphCanvas`, `FilterRail`, `NodeDetail` (as the Inspector), `FocusBar`, `ZoomPad`, `GraphLegend`, `SearchPalette` (merged into ⌘K "Files" scope), `LoadingSkeleton`, `ErrorBanner`. `CoachMark` shows once per user (localStorage).

### 5.3 Severity on nodes

| Node | Treatment |
|---|---|
| Folder | `--gray-1` fill and 1px `--sev-{max}-border` border. Header chip shows `--sev-{max}` icon plus count. Folders with no findings get a `--gray-4` border and no chip. |
| File | Smaller node with a 3px left bar in `--sev-{max}-fg`, an icon chip and a count. Mono label, middle-truncated. |
| Selected / focus path | `--graph-selected-ring` / `--graph-edge-path` (amber-ui, existing). Amber never means severity. |
| Dimmed (filtered out) | 30% opacity, still focusable. |
| Legend | Always visible: the 5 severities with icon, label and count. |

Severity is shown three ways (icon, label or count, and colour), so it meets the no-colour-only rule. Nodes are keyboard-focusable (`tabindex`, arrows move between neighbours, Enter opens the inspector).

### 5.4 Cross-linking and deep links

| From | To | Mechanism |
|---|---|---|
| Finding row: "Show in graph" | Graph tab focused on the file, inspector open, finding highlighted | `…/scans/:sid/graph?focus=<path>&finding=<id>` |
| Tree node (report) | Same, focused on the folder or file | `?focus=<path>` |
| Graph inspector: finding item | Report tab with that finding expanded | `…/scans/:sid/violations?finding=<id>` |
| Graph inspector: "View all in report" | Report with path filter | `?path=<folder>` |
| Shared URLs | Restore focus, filters (`sev`, `analyser`) and zoom-to-fit on focus | Query params are the single source of truth. `json-pointer.ts` may be reused for node IDs. |

Browser back/forward steps through focus changes (use `router.replace` for pan and zoom, and `push` for focus changes).

---

## 6. PR plan

| # | Title | Scope | Files touched | Acceptance criteria | Size |
|---|---|---|---|---|---|
| PR1 | Product tokens and app shell | Add neutral ramp, `--accent`, `--sev-*`, type 12–32, `--font-family-mono`, radii, elevation and motion tokens (both themes) plus reduced-motion. New `AppShell`, `Sidebar` (BrandMark, workspace slot, nav), `TopBar` (breadcrumbs, ⌘K button stub). Router: nested `/w/:ws/...` routes plus `/dashboard` redirect. Update `design-system.md`. | `styles/variables.css`, `components/ui/AppShell.vue`, `Sidebar.vue`, `TopBar.vue`, `Breadcrumbs.vue`, `router/index.ts`, `App.vue`, `knowledge/coding-standards/design-system.md` | Both themes render the shell. Text tokens meet AA (§3.2). Focus ring is visible on all shell controls. No hex in new components (lint or grep). Existing dashboard renders inside the shell. Unit tests for the router redirect. | M |
| PR2 | Fold the graph viewer into the dashboard | `GraphView.vue` route `…/scans/:sid/graph`. Load the graph from the scan API. Mount viewer components inside the shell. Delete the storage handoff and the `viewerHref` link-out. Remove the compose `viewer` service, the `8080` port and the Dockerfile `viewer` target (or keep `/viewer` public route, see Q1). Severity node mapping per §5.3. Deep links `?focus=`. | `views/GraphView.vue`, `viewer/components/*` (token migration), `viewer/ViewerApp.vue` (split), `components/dashboard/DashboardGraphPanel.vue` (→ link), `services/viewer-link.ts`, `services/viewer-graph-handoff.ts` (+tests), `docker-compose.yml`, `apps/web/Dockerfile`, `scan-report-severity.ts` | The graph opens on the same origin inside the shell with no :8080. Back returns to the report. `?focus=path` centres and selects the node. Critical and high are distinct. Every node with findings shows an icon and count. The worker still runs off the main thread. Reduced motion disables animated fit. | M |
| PR3 | Shared UI primitives | Button, Input, Select/Menu, Tabs, Table, SeverityPill/Chip, StatusPill, Card, Stat, SeverityBar, EmptyState, Skeleton, ErrorBanner (from viewer), Toast (replaces `DashboardToast`), Dialog. | `components/ui/*`, `DashboardToast.vue` (remove), viewer `ErrorBanner`/`LoadingSkeleton` (move) | Each has keyboard and ARIA behaviour per §3.6 and a unit test. Toast uses a single `aria-live` region. | M |
| PR4 | Interactive report rebuild | Split `ScanReportPanel.vue`. Tabs with counts plus a Graph tab. URL-synced filters. Findings table. Tree with severity chips. Architecture empty-state distinction. Export menu plus toasts. "Show in graph" links. | `ScanReportPanel.vue` → `Report*.vue`, `ScanReportTree.vue`, `ScanReportArchitecturePanel.vue`, `ScanReportAnalysers.vue`, `scan-report-filters.ts`, `scan-report-export.ts`; remove `ScanReportHierarchyGraph.vue`, `ScanReportModuleGraph.vue` | Filters survive reload. Every tab has empty, loading and error states. Severity is never colour-only. Arrow keys move between tabs. Graph cross-links work both ways. | M |
| PR5 | Open project and scan stepper | Segmented source picker, per-source panels, drop zone, live validation, `ScanStepper`, `useScanRun`, auto-navigate to report. | `OpenProjectPanel.vue` → `Open*Source.vue`, `services/scan-poll.ts`, `folder-zip.ts`, `upload-archive.ts`, `git-remote-url.ts`, `dashboard-messages.ts` | Size limit shown before upload. Steps reflect real phases. Failure marks the step and offers Retry. Stepper text is `aria-live`. | M |
| PR6 | Projects list, project summary and past scans | Projects table home, summary with Stat and SeverityBar (API data only), scans table with StatusPill, auto-poll and empty states. Remove `SyntheticArchitectureDemo` from the product view. | `DashboardView.vue` (shrink to route views), `DashboardScansHub.vue`, `ScanListPanel.vue`, `dashboard-graph-stats.ts`, new `views/ProjectsView.vue`, `ProjectSummaryView.vue`, `ScansView.vue` | `DashboardView.vue` is gone or under 200 lines. Skeletons replace "…" text. Raw errors sit behind "Details". | M |
| PR7 | Workspaces switcher | Sidebar switcher menu, create workspace dialog, empty state, workspace in URL. | `services/workspaces.ts`, `components/ui/WorkspaceSwitcher.vue`, router | Switching updates the URL and data. Empty workspace flow works. Keyboard menu. | S |
| PR8 | Sign-in restyle | Product-style auth card, BrandMark lock-up, field ARIA, error banner, session-expired notice. | `AuthView.vue`, `AuthShell.vue`, `AuthField.vue`, `auth-core-messages.ts` | AA in both themes. `aria-invalid` and `aria-describedby` on errors. No glow or gradient. Follows `auth-ui-principles.md`. | S |
| PR9 | ⌘K command palette | Projects, scans, files and actions, built from `SearchPalette.vue`. | `components/ui/CommandPalette.vue`, `TopBar.vue` | ⌘K / Ctrl+K opens it. Full keyboard support. Focus returns on close. | S |

---

## 7. Open questions

1. Keep a public, unauthenticated `/viewer` (drop a JSON file) for the landing page sample, or remove the standalone viewer entirely?
2. In PR1, should the existing `--color-accent-*` and cyan tokens be re-pointed to the new neutral and blue system app-wide, landing page included, or should product tokens (`--ds-*`) be scoped to the shell only?
3. Is a blue interactive accent acceptable alongside amber-ui, given that "low" severity is also blue? The alternative is to use amber-ui for primary buttons as well, so there is a single accent.
4. Should `SyntheticArchitectureDemo.vue` leave the dashboard and move to marketing only?
5. Does the scan API support cancel and step-level progress? This decides the stepper's fidelity.
6. Which export formats are required (JSON, Markdown, CSV, SARIF)?
7. Does the product name ("Atlasmith" vs "Structura" in docs and repo) change in all UI copy now, or later?
