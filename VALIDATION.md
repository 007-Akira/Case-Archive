# Validation — 2 November 2026

Executed with Node 24.17.0 and npm 11.13.0.

| Check                                                  | Actual result                                                                                                                                                                                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                    | Passed, strict TypeScript                                                                                                                                                                     |
| `npm run build`                                        | Passed; Vite production output plus manifest, icons and generated Workbox service worker                                                                                                      |
| `npm test`                                             | 27 passed across 5 files                                                                                                                                                                      |
| `npm run test:e2e`                                     | 4 passed: protected routes / login / overflow at 320, 390, 768 and 1440px; 4 live account tests skipped (credentials absent), before the optional fixture suite was added                     |
| `E2E_MOCK=1 npm run test:e2e` (final run)              | 8 passed; 4 live account tests skipped. Explicit HTTP fixtures cover private dashboard/archive/editor/settings interactions, filter Escape dismissal, saving and logout across all four sizes |
| `npm run test:pwa`                                     | 1 passed against production build: manifest, service worker control, private API cache exclusion and offline shell navigation                                                                 |
| Screenshot inspection                                  | Mobile and desktop editor screenshots inspected; generated under ignored `test-results/`                                                                                                      |
| Live Supabase Auth / CRUD / RLS / concurrent numbering | Not executed: no project configuration or authorized test accounts supplied                                                                                                                   |
| SQL migration application                              | Not executed against a database; migration is supplied for project setup                                                                                                                      |
| `npm audit` (online)                                   | 10 advisories: 2 low, 8 moderate, all in development-only `vite-plugin-pwa` / Workbox build dependencies; no high/critical advisories reported                                                |

Unit/component coverage includes draft/completion/age validation, title fallbacks, resume field conversion, autosave debounce, confirmed success, failure retention/retry, serialized overlapping edits, explicit new-empty-draft persistence, protected-route redirect, login errors, recovery confirmation, editor navigation, existing draft identity, unsaved navigation protection, completion errors, server search/filter/range parameters, draft payload null conversion, favorites and deletion.

HTTP fixtures exist only inside the browser tests. The application never switches to a simulated backend. These UI checks do not establish real database behavior or cross-user isolation.

The audit advisories concern transitive build-time glob/minimatch, template and merge dependencies. The audit's suggested forced change downgrades the current PWA plugin across a major version; this was not applied blindly. Review upstream updates before production deployment. The app has no server-side template engine or user-supplied build inputs.

Remaining configuration: create Supabase project, apply SQL, disable public signups, provision authorized accounts, set `.env` public URL/key, configure recovery redirect URLs and SMTP, and run the live disposable-account tests described in README. Installation / Add to Home Screen UI varies by browser; the native install prompt itself was not automated. Secure offline clinical editing and cross-device edit conflict resolution are not implemented.

## Live Supabase verification — 4 November 2026

The local environment is now configured with the supplied project URL and public publishable key. The database password was used through hidden process input only; it was not written to the repository or frontend.

- Applied `202611020001_casebook.sql` successfully using a TLS connection with verified Supabase CA and hostname.
- Confirmed RLS is enabled on profiles, cases, and case_counters.
- Passed rollback-only database checks for own-user CRUD, completion constraints, retry identity, cross-user access denial, profile isolation, counter denial and immutable ownership. Temporary test records and users were rolled back.
- Provisioned two disposable, confirmed random-email test accounts at the user's request. Generated credentials are stored only in ignored `.env.test` with permissions 0600; the database password is not stored there. These `.invalid` addresses cannot receive password-recovery email.
- Passed the real API `supabase/tests/isolation.mjs` checks, including concurrent numbering and retry stability. Its created cases were cleaned up.
- Passed all four real browser case lifecycle tests at 320, 390, 768 and 1440px: login, draft saving, completion, favorites and deletion.

These live results supersede the earlier "not executed" entries for database application, real CRUD, RLS and concurrent numbering. Password recovery email delivery and actual installation prompts remain unverified.

Remaining dashboard configuration: public signup was observed enabled and must be disabled under Authentication; configure the local `/reset-password` redirect and production URLs/SMTP when deploying. Database credentials and a publishable key cannot change project-level Auth configuration through the Management API. Replace disposable accounts with an authorized real-email account before normal use.

## Approved accounts and mixed sign-in — 4 November 2026

- Created and confirmed the specifically requested real-email account; verified its supplied password using Supabase Auth and verified approved archive access. Its password was passed through hidden process input and was not saved in source or environment files.
- Reused the two previously provisioned disposable accounts for development and isolation tests; local credentials remain in ignored `.env.test`.
- Applied `202611040001_approved_archive_access.sql`. Membership starts empty in the migration. Deployment approved only the requested real account and the two exact existing test accounts; no blanket approval of other users was performed.
- Added backend-enforced approval policies and a frontend access check, plus a Google OAuth action gated by actual Supabase provider availability.
- Real API isolation/concurrent-numbering verification passed again. All four real browser case lifecycle tests passed again after the approval migration.
- TypeScript and production build pass. Build reports a JavaScript chunk-size advisory.
- Google provider activation/consent and recovery email delivery remain unverified and require dashboard configuration. No emails were sent during account provisioning or verification. Public signup should still be disabled in dashboard; the backend approval gate independently prevents unapproved accounts from using the archive.
- Additional rollback-only database check passed: an unapproved authenticated account could not read cases/profiles or insert its own case; explicit admin membership enabled access. A reproducible version is in `supabase/tests/approval.sql`.

## Email/password-only update — 4 November 2026

At the user’s request, removed Google OAuth UI, provider checks and related setup requirements. Admin approval, email/password login and Supabase email recovery remain. Gmail can receive the recovery link; changing a Gmail password does not change the Casebook password. Recovery delivery still requires the Supabase email/redirect configuration noted above.

## Security preparation and private test launch — 4 November 2026

- Added Cloudflare/Vercel security-header and SPA routing configuration; actual host response verification remains required.
- Added optional Turnstile login/recovery integration; no site key or server CAPTCHA configuration is assumed.
- Applied and directly tested the five-attempt/15-minute password-verification hook, including expiry and no browser execution permissions. Supabase Auth hook activation remains pending; this is not represented as active brute-force protection.
- See SECURITY.md for the exact remaining project settings and launch boundaries.

## Password visibility, seven-day sessions and deletion — 4 November 2026

- Applied the seven-day session migration. Rollback-only database verification passed: an approved fresh session can use the archive; the same session with creation older than seven days cannot read or insert cases, even with current JWT claims. Temporary records were rolled back.
- Added accessible password visibility controls, shared case/draft deletion confirmation, deletion row confirmation, and safe autosave pause/settle during editor deletion.
- Added session cutoff, expired cached login, confirmation/cancel/retry, password-toggle, and autosave/delete concurrency coverage.

- Final verification: 38 unit/component tests passed; strict TypeScript and production build passed; all eight live browser scenarios passed sequentially at 320, 390, 768 and 1440px. Live API isolation/concurrent-numbering checks also passed after session-policy application. Integration scenarios sharing one disposable account run sequentially to avoid cross-scenario authentication interference.

## Scheduled heartbeat — 4 November 2026

- Applied `202611040004_backend_heartbeat.sql` and verified its anonymous invocation succeeds while anonymous SELECT privilege on cases remains denied.
- Configured only the project URL and public publishable key as GitHub Actions repository variables; Actions is enabled.
- Added four-per-day external health checks, bounded retries/timeouts and a manual trigger. Scheduled execution remains subject to GitHub/Supabase availability and public-repository inactivity policies.

## Direct Cloudflare launch — 4 November 2026

- Deployed `casebook-archive` to https://casebook-archive.keshappan.workers.dev in the authorized Cloudflare account. Worker version: `55997603-8612-4447-aab0-4bd95d650280`.
- Production build and Wrangler upload validation passed (approximately 622 KiB gzip). Request observability and source-map upload are disabled; no runtime secret/database binding is deployed with the static frontend.
- Verified HTTPS 200 and explicit CSP, framing denial and nosniff headers on login, SPA routes, manifest and service worker.
- All eight live browser workflows passed against Cloudflare at 320, 390, 768 and 1440px using the disposable account. Created test records were deleted by the workflows.
- Production PWA test passed against Cloudflare: manifest, service-worker control, API-cache exclusion and offline shell.
- Strict TypeScript and all 38 unit/component tests passed after adding reproducible Cloudflare deployment and external-host test configuration.
- Supabase production recovery redirect/SMTP and pending Auth protection activation still require dashboard configuration; deployment does not imply these have been enabled.

## Free Pages address — 4 November 2026

Published the existing hardened Worker in Pages advanced mode at https://casebook-archive.pages.dev, removing the personal account name from the primary URL. Verified HTTPS, CSP response headers, real Supabase sign-in using a disposable approved account, and the production manifest/service-worker/offline-shell Playwright check (1 passed). The Supabase backend is unchanged. Existing PWA installations and browser sessions belong to the old origin; sign in and install from the new address. Password recovery still requires the new origin and `/reset-password` redirect in Supabase configuration.

## PWA install controls — 4 November 2026

Added Settings → Install Casebook and a first-dashboard-visit installation offer once per browser session. Captures `beforeinstallprompt` before authenticated views mount, invokes the native prompt only from a user click, consumes each event once, and updates the UI on `appinstalled` or standalone display mode. Safari/iPhone receives manual Add to Home Screen instructions. Dismissal leaves installation accessible through Settings.

Validation: production TypeScript/build passed; 41 unit tests passed, including three installation lifecycle tests. Live Pages browser checks verified the automatic offer, dismissal surviving reload, Settings reopening, native-event handoff and installed state with simulated browser events, and iPhone instructions with an emulated user agent. Live manifest/service-worker/offline-shell test passed. Actual OS installation and Safari Share-sheet actions require a device/browser user confirmation and were not automated.

## Password recovery diagnosis — 4 November 2026

A recovery verification probe with a deliberately invalid token and an explicit Pages `/reset-password` redirect returned HTTP 303 to `http://localhost:3000/` with `otp_expired`. The previous Workers origin also fell back to localhost. No real recovery token was consumed and no email was sent by this diagnostic. Supabase's project-level Site URL / redirect allowlist remains a dashboard configuration requirement; current database and public API credentials cannot update it.

Improved reset-page handling: waits for session initialization, rejects missing recovery sessions and expired-link errors with a new-link action, avoids reloading an already-open reset route on PASSWORD_RECOVERY, and confirms successful updates. All 43 unit tests and production TypeScript/build passed. The actual Gmail-delivered recovery flow remains pending the dashboard URL correction and a fresh email link.
