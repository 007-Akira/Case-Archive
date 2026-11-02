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
