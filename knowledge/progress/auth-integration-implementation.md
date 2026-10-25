# Authentication Integration Implementation

**Date:** 2026-10-20

## Delivered

- Replaced frontend mock/localStorage registration and verification operations with typed requests to `/api/auth/*`.
- Added a reset-password screen that consumes the emailed `email` and `token` query parameters.
- Connected email OTP verification to a real API-issued session and dashboard navigation.
- Removed fake Google/Microsoft/GitHub/SSO actions; the login page offers the actual email OTP flow and states that OAuth providers are not configured.
- Hashed newly set passwords with Node's scrypt implementation; existing plaintext API passwords are upgraded after successful login.
- Hashed verification codes, OTPs, reset tokens, and issued session tokens before persisting them. Verification, OTP, reset, and session credentials now have expiry times. Logout revokes its session; password reset revokes all existing sessions.
- Added HTML/text verification, OTP, and reset-email templates with HTML escaping. API SMTP configuration is compatible with Resend's SMTP endpoint.
- Added Mailpit to Compose at `http://localhost:8025` for local email inspection. Compose defaults to Mailpit and supports overriding SMTP options from an untracked `.env` file.
- Removed legacy local demo-account, fake-session, and browser-stored verification/reset data so the frontend cannot keep using the insecure mock flow.
- Added focused template tests.

## Configuration

Mailpit defaults are configured in Compose. To use Resend over SMTP, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, and `FRONTEND_URL` in a local `.env`. Use a verified sender with Resend; never put API keys in committed Compose or source files.

Start all services with:

```sh
docker compose up --build
```

Inspect local messages at `http://localhost:8025`.

## Validation

The API build, frontend Vue/TypeScript build, Compose configuration, and email-template unit tests passed. Docker runtime was not exercised because the OrbStack daemon was unavailable in this environment.

## Follow-up before production

Configure a real OAuth provider if SSO is required; migrate browser session storage to secure HTTP-only cookies; apply session validation middleware to protected API routes; add auth rate limiting and email-send throttling; and migrate existing plaintext password records through successful-login rehashing or a forced reset policy.
