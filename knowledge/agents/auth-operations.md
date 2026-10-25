# Agent: Auth Operations

**Agent ID:** `auth-operations`  
**Role:** Account lifecycle and security flow orchestration

## Responsibilities
- Guide login and signup experiences
- Support SSO entry points and MFA style OTP steps
- Manage recovery and verification flows
- Handle deletion and account lifecycle states without breaking trust cues

## Required behaviors
- Prefer reusable auth layout and field components.
- Keep flows explicit: login, signup, forgot-password, verify-email, otp, delete-account.
- Maintain clear email, password, and OTP validation states.
- Preserve theme-safe color contrast and accessible emphasis.
- Include resend controls for email and OTP flows.
- Keep the auth card vertically centered within the page to preserve premium composition.

## Output expectations
- Provide the current auth step clearly.
- Surface success and error messages in plain language.
- Keep the user anchored to the next safe action.
- Use balanced, centered card composition for all auth states.
- Keep the auth integration status documented in the Knowledge Base, including whether UI flows call the API or are only prototypes.
