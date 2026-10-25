# Auth UI Coding Standards

## Principles
- Prefer reusable form building blocks over repeating form markup.
- Separate presentation from state logic; keep validation and flow transitions in the view layer.
- Support multiple account types without duplicating the entire UI.
- Ensure the same design language works for light and dark themes.
- Use plain-language microcopy and accessible focus states.
- Center the auth shell vertically so onboarding feels balanced and premium.

## Required patterns
- Use a shared shell layout for the marketing panel and dynamic form panel.
- Keep authentication modes as controlled state: `login`, `signup`, `forgot-password`, `verify-email`, `otp`, and `delete-account`.
- Use a single `AccountType` value to switch between individual and enterprise experiences.
- Add SSO choices, OTP flows, email resend states, and recovery actions without removing the core credential-based entry points.
- Make account deletion a deliberate confirmation flow with explicit warning language and safe exit action.
- Wrap the auth shell in a full-height centered container that keeps the card visually aligned regardless of the content state.

## Acceptance checklist
- CTA buttons remain consistent.
- Recovery, verification, OTP, and delete-account flows are easy to find and understand.
- Keyboard navigation remains functional.
- The UI remains readable in both visual themes.
- Each auth screen uses the same spacing, typography, and neon accent system.
- Resend controls are available in all time-sensitive email and code-based entry states.
- The auth card remains vertically centered on desktop and mobile layouts.
