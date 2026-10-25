# Decision 006: Formal Structura Design System

Date: Day 2  
Project: Structura

We formalized a shared design system for all web UI work.

## Why

- Existing CSS variables and theme support provided a useful start, but styles also included duplicated foundations and one-off values.
- Shared tokens and explicit rules reduce visual drift and improve accessibility across screens.
- A focused skill gives agents a repeatable process for design-system-compliant UI changes.

## Implementation

- Canonical CSS tokens and global foundations in `apps/web/src/styles/variables.css` and `apps/web/src/style.css`
- Design standards in `knowledge/coding-standards/design-system.md`
- Skill documentation in `knowledge/skills/design-system.md`
- Skill implementation in `packages/skills/src/design-system.ts`
- Existing web component styles are migrated to semantic tokens; legacy token aliases were removed.
- Responsive breakpoints are documented, and reusable page widths use shared content-width tokens.
