# Skill: Structura Design System

**Skill ID:** `design-system`  
**Version:** 1.0

## Purpose

Ensure new and changed Structura UI follows the shared visual system consistently across components, screens, and themes.

## When to use

Use whenever creating, modifying, or reviewing web UI, styles, components, themes, or responsive behavior.

## Required workflow

1. Read [Structura Design System](../coding-standards/design-system.md) and inspect adjacent components before editing.
2. Reuse existing components and semantic CSS variables from `apps/web/src/styles/variables.css`, including shared alpha, size, content-width, radius, shadow, and motion tokens.
3. Do not add raw design values locally. If the required value is missing, first add a semantic token and define its light and dark theme behavior.
4. Preserve the established product direction: navy/cyan/violet dark theme and coordinated light theme.
5. Reuse documented responsive breakpoints and ensure the changed UI handles keyboard navigation, visible focus, accessible names, and applicable interaction states.
6. For loading and feedback, use content-shaped skeletons for initial loading, in-place spinners for short operations, and localized live-region toasts for brief confirmations. Keep recoverable errors visible next to the affected content.
7. Check text/control contrast in both themes and respect reduced-motion preferences.
8. Verify the finished change against the design-system checklist and run relevant project checks.

## Review checklist

- Are colors, spacing, typography, radii, shadows, and motion drawn from shared tokens?
- Are responsive breakpoints reused, with component geometry limited to content-specific layout needs?
- Are one-off values and hardcoded theme-specific colors avoided?
- Is the UI coherent with neighboring components and the established product direction?
- Does it work in both themes, narrow layouts, and with keyboard focus?
- Are status colors semantic and are status cues not color-only?
- Is reduced motion respected?
- Were any necessary new tokens documented and provided for both themes?

## Output expectations

Report any design-system violations found during review. For implementation, identify any missing shared token and add it to the central system rather than defining it locally.
