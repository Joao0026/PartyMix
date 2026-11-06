# PartyMix — Technical hardening roadmap

**Review date:** 2026-11-06  
**Scope:** selective static source review plus the repository's existing GitHub Actions CI run. This is not a penetration test or production certification.

## What was reviewed

The review inspected the Express server setup, REST route registration, age-state handling, rate-limit middleware, Socket.IO initialisation, frontend API configuration, PWA configuration, package scripts and the existing test layout.

The deployed site could not be reliably inspected with the available browser tooling. Production behaviour, deployment environment variables and real-device behaviour therefore remain unverified.

## Existing automated checks

The repository already has a GitHub Actions workflow at `.github/workflows/ci.yml`. It installs the root, backend and frontend dependencies with lockfiles, runs backend syntax checks and tests, builds the frontend, installs Chromium and runs Playwright browser tests.

**Observed result for this pull request:** workflow run **42246657275** completed successfully. All listed steps passed, including backend checks/tests, frontend build and Playwright browser tests. This validates the current CI run; it does not prove production configuration or live hosting is correct.

## Prioritised work

### P0 — Production verification

- Confirm the deployed frontend has the correct `VITE_API_BASE_URL` pointing to the HTTPS backend.
- Confirm backend production variables are configured: `MONGODB_URI`, strong `JWT_SECRET`, strong `ADMIN_PASSWORD` and explicit `CORS_ORIGINS`.
- Verify frontend, REST API and Socket.IO use the intended HTTPS origins.
- Exercise health checks, room creation/joining, reconnects and direct navigation on a staging deployment before release.

**Acceptance criteria:** staging checks pass over HTTPS, the database is connected, and the app can reach its API and real-time service without mixed-content or CORS errors.

### P1 — Trust boundaries and session controls

- Document the threat model for age-state declarations. A self-declared value must not be described as verified identity or proof of age.
- Review REST and Socket.IO entry points for consistent enforcement of applicable product restrictions and session rules.
- Review server-side ownership, state-transition validation, replay protection and safe handling of concurrent requests for age-appropriate neutral functionality.
- Confirm public room payloads never include credentials, private tokens or internal persistence fields.
- Ensure logs never include tokens, passwords or private user content.

**Acceptance criteria:** automated tests cover unauthorised actions, invalid state transitions, reconnects, duplicate submissions and private-field redaction. Restrictions are enforced server-side, not only by frontend navigation.

### P1 — Resource limits and reliability

- Review rate limits for memory growth and behaviour across restarts or multiple backend instances.
- Use shared storage for limits that must be consistent across instances.
- Add bounded timeouts and size limits to uploads and real-time events.
- Verify room cleanup and persistence under restart, disconnect and database-failure conditions.

**Acceptance criteria:** resource limits remain bounded under sustained traffic and behave predictably when more than one backend instance is running.

### P2 — PWA and frontend quality

- Confirm there is one authoritative service-worker registration and one cache lifecycle.
- Test installability, update delivery, offline fallback and recovery from stale cached assets.
- Test direct navigation to nested routes and refreshes on the deployed host.
- Run responsive checks at narrow mobile widths and desktop widths.
- Add accessibility checks for keyboard navigation, labels, focus visibility, contrast and reduced-motion preferences.

**Acceptance criteria:** the app installs, updates and navigates directly to supported routes without blank screens; core screens remain usable at mobile and desktop sizes.

### P2 — Observability and maintenance

- Use structured logs with request IDs and redact personal or secret values.
- Add monitoring for API errors, WebSocket connection failures, database availability and deployment health.
- Document backup/restore expectations and a tested recovery procedure.
- Keep dependencies updated through automated dependency review and scheduled maintenance.

**Acceptance criteria:** operators can identify a failed API, database or real-time connection without exposing user secrets in logs.

## Recommended implementation order

1. Verify production environment variables and HTTPS/CORS in staging.
2. Review server-side authorisation and state transitions for neutral functionality.
3. Review REST and Socket.IO policy consistency and session boundaries.
4. Harden rate limits, upload limits and persistence.
5. Validate PWA lifecycle, mobile accessibility and production navigation.
6. Add operational monitoring and recovery documentation.

## Verification status

| Area | Status |
|---|---|
| Selective source inspection | Completed |
| Existing GitHub Actions CI | Passed on this PR (run 42246657275) |
| Backend syntax checks and unit tests | Passed in CI |
| Frontend production build | Passed in CI |
| Playwright browser tests | Passed in CI |
| Live production interaction | Not verified |
| Security penetration test | Not performed |
| Physical mobile-device testing | Not performed |

Treat this roadmap as a prioritised engineering plan, not a statement that all findings have already been fixed. Production changes should be verified in staging before release.
