# Skill: Auth UI Patterns

**Skill ID:** `auth-ui-patterns`  
**Version:** 1.0  
**Created:** Day 2

## Purpose
This skill helps AI agents create secure, reusable, and polished authentication UIs that fit the Structura design system.

## Scope
- Login screen design
- Signup flows for individual and enterprise accounts
- SSO entry states and OTP verification patterns
- Forgot password recovery and resend flows
- Email verification states with resend controls
- Delete-account confirmation and recovery-safe messaging
- Theme-aware, accessible UI patterns
- Centered auth page composition for premium onboarding screens

## Preferred implementation model
- Reuse a shared auth shell + field components.
- Use a single route/state controller for flow transitions.
- Keep primary actions and security cues visible.
- Add helper text for password, OTP, and recovery flows.
- Include resend actions for email verification and OTP delivery.
- Treat destructive flows like delete-account as explicit, confirm-before-action states.
- Center the auth card vertically within the page so onboarding feels intentional and balanced.

## Best practices
- Keep forms short and understandable.
- Align tabs and account-type toggles to the same visual system.
- Use consistent spacing and accent colors for status states.
- Favor component composition over one giant monolithic screen.
- Ensure destructive actions use a clearer warning hierarchy and confirmation checkbox.
- Support route-driven screens for login, signup, forgot-password, verify-email, otp, and delete-account.
- Maintain consistent page-level centering for the auth composition across all states.
