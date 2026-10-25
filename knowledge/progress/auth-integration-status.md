# Authentication Integration Status

**Status checked:** 2026-10-21  
**Scope:** Frontend auth screens and service, Fastify auth endpoints, PostgreSQL persistence, and email delivery

## Summary

Password registration/login, email verification, email OTP, password recovery, and account deletion are connected to the API. Verification, OTP, and password-reset messages are sent via SMTP; the Compose development environment provides Mailpit for local inbox inspection. Passwords and one-time credentials are hashed at rest, and API-issued sessions expire after eight hours.

## Capability status

| Capability | Status |
|---|---|
| Register | Integrated with API; password is scrypt-hashed; verification email is sent |
| Login/logout | Integrated; successful login issues an expiring API session and logout revokes it |
| Verify/resend email | Integrated; email code is hashed at rest and expires after 15 minutes |
| Email OTP | Integrated; OTP is hashed, expires after 10 minutes, and issues a session on verification |
| Forgot/reset password | Integrated; emailed reset link expires after 30 minutes; successful reset revokes existing sessions |
| Delete account | Integrated with API and password re-verification |
| SSO | Not implemented; UI no longer pretends provider buttons invoke SSO |

## Local email testing

Run the stack with `docker compose up --build`. Open Mailpit at `http://localhost:8025` and inspect the verification, OTP, and password-reset emails there. The frontend is at `http://localhost:5173`.

To use Resend's SMTP service instead of Mailpit, create a local `.env` file (do not commit credentials) with:

```dotenv
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASSWORD=re_your_api_key
EMAIL_FROM=Structura <verified-sender@your-domain.example>
FRONTEND_URL=http://localhost:5173
```

Resend requires a verified sending domain/address. For local Mailpit, leave these SMTP variables unset; Compose defaults to its `mailpit` service.

## Implementation references

- API routes, password hashing, code expiration, and session records: `apps/api/src/index.ts`
- Reusable HTML/text templates and SMTP sender: `apps/api/src/lib/auth-email.ts`
- Frontend API client and session persistence: `apps/web/src/services/auth.ts`
- Auth forms including password-reset completion: `apps/web/src/views/AuthView.vue`
- Local PostgreSQL, Mailpit, API, and frontend services: `docker-compose.yml`
- Implementation notes and configuration details: `knowledge/progress/auth-integration-implementation.md`

## Known limitations

- The shared navbar switches between unauthenticated login/launch links and an authenticated logout action; session state is rechecked on route changes.
- Google, Microsoft, GitHub, and enterprise SSO are not configured; no OAuth provider credentials or callback routes were supplied.
- Session tokens are stored in browser local storage; use an HTTP-only secure cookie before deploying to production.
- Workspace/project routes validate active API session records and enforce membership-based access. Other product APIs and source-bearing resources do not exist yet; do not treat this as complete production tenancy.
- Signup rate limiting and email-send throttling should be added before public production exposure.
- Existing plaintext passwords are upgraded to scrypt hashes on the user's next successful login. Old demo-only localStorage auth data is removed by the frontend auth service.

## Validation

- `npm --prefix apps/api run build`
- `npm --prefix apps/api test`
- `npm --prefix apps/web run build`
- `docker compose config --quiet`

Compose configuration and builds are validated. Running the containers still requires the local OrbStack Docker daemon to be started.
