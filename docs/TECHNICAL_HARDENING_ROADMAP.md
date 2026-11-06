# PartyMix — Technical hardening roadmap

**Review date:** 2026-11-06  
**Scope:** static review of repository source. This document is a prioritised engineering plan, not a penetration test or a production certification.

## What was reviewed

The review inspected the Express server setup, REST route registration, age-state handling, rate-limit middleware, Socket.IO initialisation, frontend API configuration, PWA configuration, package scripts and the existing test layout.

The deployed site could not be loaded by the available browser inspection, and the repository was not checked out in an executable environment. Therefore no claim is made that the live app, automated tests or production build were successfully run.

## Prioritised work

### P0 — Establish a reliable release baseline

- Run the backend syntax check and unit-test suite in CI.
- Run the frontend production build in CI.
- Make CI required for pull requests to the default branch.
- Record Node.js versions and use lockfile-based installs for reproducible builds.
- Add a short release checklist covering environment variables, API reachability, database connectivity and PWA installation.

**Acceptance criteria:** a clean pull request receives a passing CI result for backend checks/tests and frontend build; deployment is not considered verified solely because CI passes.

### P1 — Review trust boundaries and session controls

- Document the threat model for age-state declarations and decide what assurance level the product actually requires. A self-declared value must not be described as verified identity or proof of age.
- Review REST and Socket.IO middleware so that equivalent product restrictions and session rules are consistently enforced at both entry points.
- Review room actions for server-side ownership, turn/state validation, replay protection and safe handling of concurrent requests.
- Confirm that public room payloads never include credentials, private tokens or internal persistence fields.
- Keep secrets in deployment environment variables; ensure logs never include tokens, passwords or uploaded private content.

**Acceptance criteria:** tests cover unauthorised actions, invalid state transitions, reconnects, duplicate submissions and private-field redaction. Any policy restrictions are enforced server-side, not only by frontend navigation.

### P1 — Production configuration

- Require an explicit production API URL; do not silently fall back to a development-style host/port when deployed.
- Verify HTTPS end-to-end and confirm that the frontend, REST API and Socket.IO endpoint use the intended origins.
- Keep the production CORS allowlist explicit and test both allowed and rejected origins.
- Verify reverse-proxy settings, health checks, graceful shutdown and database-unavailable behaviour.

**Acceptance criteria:** a deployment with missing or malformed production configuration fails clearly; a configured deployment can complete a health check and a basic API connection over HTTPS.

### P1 — Resource limits and reliability

- Review rate limits for memory growth and behaviour across restarts or multiple backend instances.
- Use shared storage for limits that are expected to be consistent across instances.
- Add bounded timeouts and size limits to uploads and real-time events.
- Verify room cleanup and persistence behaviour under restart, disconnect and database failure conditions.

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

1. Add CI for backend checks/tests and frontend build.
2. Fix and test the highest-risk server-side authorisation/state-validation findings.
3. Review REST and Socket.IO policy consistency and session boundaries.
4. Make production configuration explicit and verify HTTPS/CORS.
5. Harden rate limits, upload limits and room persistence.
6. Validate PWA lifecycle, mobile accessibility and production navigation.
7. Add operational monitoring and recovery documentation.

## Verification status

| Area | Status |
|---|---|
| Source inspection | Reviewed selectively |
| Live production interaction | Not verified |
| Backend test suite | Not executed |
| Frontend production build | Not executed |
| Security penetration test | Not performed |
| Mobile device testing | Not performed |

This roadmap should be treated as a starting point. Each item needs an implementation, automated tests where possible, and verification in a staging deployment before release.
