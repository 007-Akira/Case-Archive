# Casebook — Personal Clinical Case Archive

Private, invite-only React / TypeScript / Vite PWA backed by Supabase Auth and PostgreSQL. The supplied five-screen Stitch reference is preserved in `stitch-reference.html`. No demo cases or simulated backend are used.

## Run locally

Requires Node 22.12+ (Node 24 recommended).

```bash
npm ci
cp .env.example .env
# Fill in the two public Supabase values below.
npm run dev
```

Open http://localhost:5173. Without configuration, the login screen explains setup and disables authentication. This is intentional.

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

Use your project's publishable key (legacy public anon keys are also supported by Supabase). Never use `service_role`, `sb_secret_*`, database passwords, or admin credentials in Vite variables.

## Supabase setup

1. Create a Supabase project. Copy its project URL and publishable key from project settings into `.env`.
2. Apply `supabase/migrations/202611020001_casebook.sql` in the SQL editor, or link your Supabase CLI project and run `supabase db push`. The migration creates tables, triggers, constraints, indexes, grants, and RLS policies; do not run it from the frontend.
3. In Authentication settings, disable **Allow new users to sign up**. There is no public signup UI. Provision authorized accounts with the dashboard's Add user / Invite user facility or trusted server-side administration. Complete invitation setup through your configured Supabase email flow; the app's forgot-password flow can set an authorized account's password.
4. Set the Auth Site URL to your app origin. Add `http://localhost:5173/reset-password` and your exact deployed `/reset-password` URL to allowed redirect URLs. Configure production SMTP and email templates. Recovery uses Supabase's [documented recovery API](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) and authenticated password update.
5. Sign in, edit your profile name, create a de-identified draft, refresh, resume, complete, edit, favorite, and delete. Verify counts and filters after each change.
6. Provision a second disposable user and run the isolation verification below before using clinical records.
7. Deploy `dist/` to an HTTPS static host with SPA fallback to `index.html`. Keep Auth redirect origins aligned. This task does not publish or provision infrastructure.

## Database and security

- `profiles`: one profile per Auth user, automatic creation and existing-user backfill.
- `cases`: complete clinical field set, date/age validation, JSONB differential diagnoses, draft/completed constraints, favorites, timestamps, and immutable owner/identity.
- `case_counters`: trigger-only per-user counters. An atomic UPSERT increments under PostgreSQL row locking; client-assigned numbers are ignored. Reusing a UUID preserves its number on retries. Gaps are acceptable; numbers are never reused.
- Every table has RLS. Profiles and cases have explicit own-user SELECT/INSERT/UPDATE/DELETE policies with WITH CHECK. Counters have no client grants/policies. The case trigger also enforces `auth.uid()`.
- All API access uses the user's Supabase session. RLS is authoritative; client filters are for browsing. Search, ranges, sort and pagination execute on PostgreSQL.
- Clinical notes remain in memory and Supabase; no localStorage, IndexedDB or service-worker case persistence. Supabase stores its authentication session for persistent sign-in. Only appearance preferences are separately saved locally. There are no analytics integrations or raw HTML renderers.
- Unsaved changes are protected on route transitions and refresh; failed saves preserve form values while the tab remains open. Closing after confirming discard loses those unsaved values.
- Writes are serialized in a single open editor. Concurrent edits in multiple tabs/devices use last-write-wins; cross-device conflict resolution is not implemented.
- Aliases alone do not guarantee de-identification. Remove identifying details from free text as well. No regulatory compliance claim is made.

## Features and structure

`src/features/auth`: login, persistent session, protected routes, recovery and password reset. `src/features/cases`: dashboard, paginated archive, filter sheet, seven-step editor, serial debounced confirmed autosave, reading mode, favorites and confirmed deletion. `src/features/settings`: profile, password recovery, logout, themes, reading size, full paginated JSON/Markdown exports. Shared navigation and accessible Radix/shadcn-style dialog primitives live in `src/components`. Tokens, responsive layout and print styles are in `src/styles/index.css`.

New drafts receive a client-generated stable UUID but are only persisted after an edit. Case numbers are assigned by the database. Drafts require no final diagnosis; completing requires alias, department, complaint and final diagnosis. Saves remember the current section in `last_step`; reopening a draft resumes there. Use the section navigator or `?step=0` through `?step=6` to select a section explicitly. All seven sections are editable for completed cases.

PDF export uses your browser's Print / Save as PDF workflow. Archive downloads contain sensitive material and should be stored securely. Theme supports light, dark and system; reading supports 16/18px.

PWA shell/assets/fonts are precached. Supabase requests are never runtime cached. Offline viewing/editing of retrieved clinical records is not a supported storage feature; unsaved edits in an already-open editor remain in memory. Offline status states explicitly that retrieval/saving is unavailable. Installability requires HTTPS (or localhost) and browser support; use the browser's Install/Add to Home Screen action.

## Checks

```bash
npm run typecheck
npm test
npm run build
npm run test:pwa
npx playwright install chromium
npm run test:e2e
# Private-screen UI checks with explicit test-only HTTP fixtures:
E2E_MOCK=1 npm run test:e2e
```

Playwright checks auth route protection and page overflow at 320, 390, 768 and 1440px. Set `E2E_EMAIL` and `E2E_PASSWORD` to run the real create/draft/complete/favorite/delete lifecycle against a disposable configured account; otherwise those tests are explicitly skipped.

For live RLS tests, create an ignored `.env.test` containing the two Vite variables and `TEST_A_EMAIL`, `TEST_A_PASSWORD`, `TEST_B_EMAIL`, `TEST_B_PASSWORD` (two different authorized disposable accounts), then:

```bash
node --env-file=.env.test supabase/tests/isolation.mjs
```

The script verifies cross-user read/update/delete/insert denial, profile isolation, immutable ownership, inaccessible counters, concurrent numbering, retry identity and completion constraints. It deletes only the records it creates, in a finally block. Do not run against sensitive production accounts.

No Supabase credentials are included. Live Auth, email delivery, migration application and RLS verification require your configured project. See `VALIDATION.md` for actual execution results.

The PWA browser test runs against the production build and verifies manifest icons, active service-worker control, cached URL privacy and offline app-shell navigation. Build first.

## Approved accounts and password recovery

Apply all SQL migrations in filename order. `202611040001_approved_archive_access.sql` adds a private, RLS-enabled membership table and restrictive policies. Its membership table starts empty: existing and newly created Auth accounts require explicit approval. Public signup, if accidentally left enabled, cannot grant archive access. The UI also checks approval through the non-enumerating `has_archive_access` RPC.

For each person you authorize, first use Supabase Authentication → Users → Add user to create a confirmed email/password account. Then run this **admin-only SQL** in the dashboard, replacing the example address:

```sql
insert into casebook_private.archive_members (user_id)
select id from auth.users where lower(email) = lower('approved-person@example.com')
on conflict do nothing;
```

To revoke archive access, delete that user's membership through the SQL editor. Never expose this table or privileged administration in browser code. The client has no permission to read or edit membership. Disable public signup in Auth settings as well.

Login uses email and password only. Google OAuth is not enabled or required.

The Forgot password flow is available to real-email accounts. Configure production SMTP and allow `http://localhost:5173/reset-password` (plus the deployed URL) in Supabase's redirects. Localhost links work only on the device running the app, so an externally accessible HTTPS deployment is needed for another person's recovery link. No recovery email is sent during provisioning. Email delivery requires dashboard configuration and have not been verified merely by creating an account.

Gmail receives recovery emails for Gmail addresses; Casebook passwords remain separate from Google/Gmail passwords.

## Seven-day sessions and deletion

Sign-in persists through the Supabase session store for up to seven days from the session's original creation. Access tokens keep their short lifetime and refresh normally; refreshing does not restart the seven-day clock. `202611040003_seven_day_sessions.sql` checks the current JWT session ID against its own row in `auth.sessions`, and the archive's membership/RLS checks deny access after the cutoff or revocation. The app uses the server-reported expiry, warns before expiry, and requests sign-in again when it expires or a sleeping tab resumes. Clearing browser storage, revocation, or other Supabase policies can end a session sooner. Clinical data is not added to browser storage.

Password fields have an accessible Show/Hide control. Completed cases and drafts have confirmed delete actions in archive/recent entries, the reading view and saved-case editor. Cancel does not write to the backend; failures keep the confirmation open for retry. Editor deletion pauses autosave and waits for the outstanding request before deleting, preventing draft recreation. A deletion is reported successful only when PostgreSQL returns the deleted owned record.

Apply all files in `supabase/migrations` in filename order for a fresh project. Supabase-managed Auth schema upgrades can change the session table; rerun the live session checks when upgrading.
