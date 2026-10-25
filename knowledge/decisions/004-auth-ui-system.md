# Decision 004: Reusable Auth UI System

Date: Day 2  
Project: Structura

We introduced a reusable authentication UI system for the landing product experience.

## Why
- The product needs both individual and enterprise sign-up flows.
- Teams expect SSO, password reset, and email verification states.
- Repeated auth patterns should stay consistent across the app.

## Implementation approach
- Shared `AuthShell` layout for the marketing panel and form panel
- Shared `AuthField` component for consistent inputs
- One source of truth for the auth flow state in `AuthView`
- Theme-aware styling so the auth experience remains premium in both light and dark modes
- Explicit account-lifecycle screens for login, signup, reset, verification, OTP, resend, and delete-account
- Reusable validation and state messaging patterns for email and security flows
- Full-height centered page wrapper for the auth card to improve balance and hierarchy on every auth view

## Expected outcome
- Faster implementation for future auth screens
- Lower UI drift across login, signup, recovery, and verification stages
- Better maintainability and lower code duplication
- More polished onboarding with the card visually centered and easier to scan
