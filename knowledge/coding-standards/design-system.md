# Structura Design System

**Status:** Active  
**Applies to:** All web UI and user-facing product surfaces

This is the source of truth for visual decisions in Structura. Implementations must use the shared tokens in [`apps/web/src/styles/variables.css`](../../apps/web/src/styles/variables.css) rather than inventing local values. Focused standards such as [Auth UI Coding Standards](./auth-ui-principles.md) add behavior-specific requirements but do not override these foundations.

Existing web screens have been migrated to the shared token system. Component-specific geometry remains local where it describes content such as the architecture illustration; shared page widths and visual styles use central tokens.

## Visual direction

- Product feel: precise, calm, technical, and polished.
- Color identity: deep navy surfaces with cyan primary accents and violet secondary accents; light theme uses corresponding accessible light surfaces.
- Use accent gradients sparingly for emphasis, primary actions, and branded highlights; never for long-form text.
- Prefer clear hierarchy and restrained surfaces over decorative effects.

## Foundations

### Color roles

Use semantic role tokens, not palette values:

- Canvas and surfaces: `--color-canvas`, `--color-surface`, `--color-surface-raised`, `--color-surface-overlay`
- Content: `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`
- Structure: `--color-border`, `--color-border-strong`
- Brand: `--color-accent-primary`, `--color-accent-secondary`, `--color-accent-tertiary`
- Status: `--color-success`, `--color-warning`, `--color-danger`, `--color-info`

The theme is controlled by `data-theme="dark"` or `data-theme="light"` on the document root. Both themes must remain usable; do not hardcode a theme-specific color in a component.

For translucent treatments, mix a semantic color token using a shared `--alpha-*` token. Do not embed RGB/RGBA or hex colors in component styles.

### Typography

- Use `--font-family-sans` for UI text.
- Use `--font-size-*`, `--font-weight-*`, and `--line-height-*` tokens for text hierarchy.
- Keep body text at `--font-size-md` or larger except for secondary metadata; metadata must remain readable.
- Use tight line heights only for display headings, not body copy.

### Spacing and layout

- Use the 4px-based `--space-*` scale for margins, padding, and gaps.
- Use `--content-width` for standard page content bounds.
- Build layouts responsively with fluid sizing and intentional breakpoints; do not use fixed widths that cause horizontal overflow.
- Keep alignment, spacing, and component density consistent between related screens.
- Existing responsive breakpoints are 640px (small), 920px (compact), 980px (tablet), and 1000px (navigation). Reuse these before adding a breakpoint. CSS custom properties cannot be used in media-query conditions, so these media-query values are an approved exception to token use.

### Shape, elevation, and motion

- Use `--radius-*` for component corners. Use `--radius-full` only for pills and circular controls.
- Use `--shadow-*` to establish elevation; avoid arbitrary shadow values.
- Use `--duration-*` and `--easing-standard` for transitions.
- Use shared duration and delay tokens for CSS animations.
- Respect reduced-motion preferences.

## Component and interaction rules

- Use semantic HTML and shared component patterns for repeated controls.
- Provide a visible keyboard focus state using the shared `--focus-ring`.
- Meet WCAG AA contrast for text and controls in both themes; color alone must not communicate status.
- Inputs, buttons, links, and navigation must have accessible names and usable pointer and keyboard targets.
- Include hover, focus, active, disabled, loading, and error states where applicable.
- Use skeletons for content-shaped initial loading, spinners for short in-place operations, and live-region toasts for brief confirmations. Keep durable errors visible with their related content or form; do not make a toast the only way to recover from an error.
- Give loading states an accessible status label, hide decorative skeleton shapes from assistive technology, label toast dismissal controls, and localize all user-facing state text.
- Use status color tokens only for their corresponding meaning.
- Avoid inline styles for design values; dynamic data values (such as chart dimensions) may remain inline.

## Strict change policy

1. New or changed UI uses the shared tokens and existing components wherever available.
2. Do not introduce raw color, spacing, typography, radius, shadow, or motion values in component styles.
3. If a genuinely new visual value is required, add it to this system and the token file first, with a semantic name and both-theme behavior where applicable.
4. A one-off exception requires a clear product reason and must not become a new undocumented convention.
5. Before completion, check the UI in both themes, responsive sizes, keyboard focus, and reduced-motion mode.

Component-level color, spacing, typography, radius, shadow, and motion values now use shared tokens. Keep using semantic token names; do not reintroduce compatibility aliases or local palette values.
