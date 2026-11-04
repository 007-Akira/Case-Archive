# Direct Cloudflare deployment

Live URL: **https://casebook-archive.keshappan.workers.dev**

Deployed on 4 November 2026.

`wrangler.jsonc` deploys the existing, tested public-asset Worker under `casebook-archive`. It serves the Vite/PWA frontend with explicit security headers and SPA routing. Supabase remains the data/authentication backend. No database credentials, passwords, source maps or clinical records are part of the deployment.

```bash
npm ci
npx wrangler login
npm run check:cloudflare
npm run deploy:cloudflare
```

The production URL is the `workers.dev` URL returned by the successful deployment, or an explicitly configured custom domain. This is separate from the owner-only ChatGPT Sites test URL: visitors can open the login page normally, while approved-account policies and per-user RLS protect the archive.

Before using password recovery, set Supabase's Site URL to the exact deployed HTTPS origin and add its exact `/reset-password` URL to allowed redirects. Configure and verify SMTP delivery. Keep public signup disabled, activate the tested password-verification hook, and configure Turnstile if desired; hosting on Cloudflare does not automatically protect Supabase's direct Auth endpoints. See SECURITY.md for the remaining controls.

Only public `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and optional `VITE_TURNSTILE_SITE_KEY` belong in build configuration. Cloudflare OAuth/API credentials belong in Wrangler's local credential store or protected deployment secrets, never in Vite variables or Git. Keep Cloudflare request observability disabled for this frontend unless a reviewed logging policy is needed. The GitHub heartbeat continues independently of the hosting provider.

For live browser verification, set `E2E_BASE_URL=https://casebook-archive.keshappan.workers.dev` when running the Playwright commands. With this variable, tests target the deployed host and do not start a local server. Use only disposable test credentials for lifecycle tests.
