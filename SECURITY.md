# Security and deployment status

## Implemented and verified

- Supabase Auth plus database-enforced explicit archive membership and own-user RLS. Arbitrary authenticated users cannot read profiles/cases or insert their own archive records.
- Private member and login-counter tables have RLS and no browser grants. Admin operations and database passwords are absent from the frontend.
- Clinical content is never persisted in localStorage or service-worker API caches; exports are explicit downloads. Persistent authentication uses the Supabase SDK session store.
- Print/export do not make public sharing links. No analytics, unsafe HTML rendering or clinical console logs.
- Cloudflare `_headers` and Vercel header configuration include CSP restricted to the project's API, framing denial, no-referrer, nosniff, HSTS and restrictive browser permissions. Static assets can be cached; app documents are marked no-store. Host enforcement must be verified on the actual deployed response.
- Optional Turnstile integration sends one-use CAPTCHA tokens to Supabase for login and recovery; expired/failed challenges reset. Set the public `VITE_TURNSTILE_SITE_KEY` only after configuring the matching secret and CAPTCHA enforcement in Supabase. Client-side widgets alone are not server protection.
- Installed/tested a private password-attempt hook: five invalid attempts block that account for 15 minutes, concurrent checks serialize with row locks, existing sessions are not invalidated by an attack, and expired blocks recover. The browser cannot call this function. Temporary lockouts can also be abused to inconvenience users; CAPTCHA and IP limits should be enabled alongside it.

## Required dashboard activation — not claimed as completed

Connect the Supabase integration or use the project's Auth settings:

1. Disable public signup and anonymous sign-in. Membership checks already independently deny unauthorized archive use.
2. In Auth Hooks, enable the Password Verification hook using `public.casebook_password_verification_hook`. Feature availability depends on the Supabase plan. Merely installing SQL does not activate the hook.
3. Configure Cloudflare Turnstile (approved hostnames, public site key in Vite; secret only in Supabase), enable Supabase CAPTCHA for login/recovery, and set appropriate server-side Auth rate limits. Requests go directly to Supabase, so a firewall only on the frontend origin cannot protect those endpoints.
4. Set the exact HTTPS Site URL and allowed `/reset-password` redirect. Configure SMTP and test delivery with the recipient before relying on recovery. Gmail receives messages but does not reset Casebook passwords itself.
5. Set a strong minimum password policy, enable breached-password checks where available, and enable MFA for privileged Supabase/hosting accounts. Rotate the database and initial account passwords shared in chat before real clinical use. MFA enrollment for application users is not yet implemented.
6. Restrict database network access to trusted administration locations, use TLS verification, and confirm backups/restore procedures appropriate to the project's plan. No backup or encryption-compliance claims have been independently validated here.

This is a test deployment, not a certification that attacks are impossible or a declaration of medical-data regulatory compliance. Use synthetic/de-identified test data until the remaining server settings and operational controls are verified.

## Hosting

Cloudflare is the preferred fit for the static Vite frontend. Supabase remains the authentication/data service on either Cloudflare or Vercel. `public/_headers`, `public/_redirects`, and `vercel.json` prepare both targets. A connected Sites private deployment is used for owner testing; it is not a deployment into the user's own Cloudflare account and is not automatically accessible to other people. A regular HTTPS host/domain is needed for the intended multi-user rollout.

## Seven-day archive sessions

The archive now enforces a seven-day absolute session limit through the authoritative Supabase session ID and creation time. Short JWT lifetimes remain in place. Revoked/missing or expired sessions cannot use the archive even if the browser attempts to retain or refresh tokens. Client expiry timers and focus checks clear the workspace and require reauthentication; a warning prompts users to save before the cutoff. This policy does not claim to alter Supabase project-wide Auth settings.
