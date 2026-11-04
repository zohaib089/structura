# Dashboard redesign PR3 — shared UI primitives

**Status:** Implemented on branch `cursor/dashboard-redesign-pr3-ui-61d0` (base: PR2 graph branch).

Added `apps/web/src/components/ui/` primitives: Button, Input, Select, Tabs (roving tabindex, Arrow/Home/End), Badge, SeverityChip (icon + label, `--sev-*`), Card, Table, Skeleton, EmptyState, ErrorState (retry event).

Cheap migrations: scan report severity filters/findings and report tabs; scan list / scans hub / open project empty-loading-error states.

Deferred to later PRs: StatusPill, Stat, SeverityBar, Toast, Dialog, viewer ErrorBanner/LoadingSkeleton promotion, full report and scans table rebuild.
