# Supabase — Migrations and Scripts

This folder contains schema migrations and seed/utility scripts for TurtleTalk. Migrations are the **source of truth** for schema. Structure and seed data can optionally be applied via Supabase MCP during development; the same changes must be captured here for reproducibility.

## Migrations

Run in order with `supabase db push` (Supabase CLI) or by pasting each file into the Supabase SQL Editor.

| File | Purpose | Tables |
|------|---------|--------|
| `001_initial.sql` | Core app tables (no auth) | `missions`, `child_memory` |
| `002_indexes.sql` | Performance indexes | indexes on `missions` |
| `003_profiles_children_waiting_list.sql` | Auth-extended profiles, children, waiting list, admin | `profiles`, `children`, `parent_child`, `waiting_list`, `feature_flags`, `support_requests` |
| `004_weekly_reports_dinner_questions.sql` | Parent-facing content | `weekly_reports`, `dinner_questions` |
| `005_auth_handle_new_user.sql` | **DB function + trigger**: auto-create `profiles` row on signup | trigger on `auth.users` |

**Note:** `missions.child_id` and `child_memory.child_id` remain `text` for backward compatibility. The app may store a legacy device id or a `children.id` (uuid) string. New flows use `children.id`.

## Seed Scripts

Run **after** migrations. Order matters if scripts depend on each other.

| Script | Purpose | When to run |
|--------|---------|-------------|
| `scripts/seed_feature_flags.sql` | Insert default feature flags | After 003 (or 004) |
| `scripts/seed_admin.sql` | Add first admin profile (manual: requires UUID from Dashboard) | After creating the user in Supabase Auth Dashboard |
| `scripts/seed-admin.mjs` | **Create admin user and profile in one go** (ianktoo@gmail.com) | After migrations. Run: `node supabase/scripts/seed-admin.mjs` (requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`) |

### seed-admin.mjs (recommended)

Creates the auth user `ianktoo@gmail.com` and inserts their admin profile so they can access `/admin`.

```bash
# From project root, with .env.local containing SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL
node supabase/scripts/seed-admin.mjs
```

If the user already exists (e.g. created in Dashboard), the script only upserts the profile. Safe to run multiple times.

### seed_admin.sql (manual alternative)

1. In Supabase Dashboard: **Authentication → Users → Add user**. Create a user with email `ianktoo@gmail.com` (no password needed if using OTP only).
2. Copy the user’s **UUID** from the Users table.
3. Open `scripts/seed_admin.sql`, replace `YOUR_AUTH_USER_UUID` with that UUID, then run the script in the SQL Editor.

## Auth: send code instead of magic link

Login uses **OTP (email code)**. Supabase must send the code in the email, not a magic link. The project accepts the length Supabase sends (e.g. 8 digits).

1. In [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **Email Templates**.
2. Open the **Magic Link** template.
3. Change the body to use the OTP token instead of the link, for example:

   **Subject:** `Your sign-in code` (or keep existing)

   **Body (HTML):**
   ```html
   <h2>Sign in to TurtleTalk</h2>
   <p>Your sign-in code is: <strong>{{ .Token }}</strong></p>
   <p>Enter this code on the login page. It expires in 1 hour.</p>
   ```

   Use `{{ .Token }}` (the code). Do **not** use `{{ .ConfirmationURL }}` or the email will be a magic link.

4. Save. New sign-in emails will contain the code; your app already verifies it with `verifyOtp` on the login page.

## Applying via Supabase MCP

When using the Supabase MCP server, you can create or alter structure and insert seed data directly in the linked project. Any such changes that must be reproducible (e.g. for new environments or CI) should also be added to:

- `migrations/` for schema
- `scripts/` for one-off seed or bootstrap

Migrations remain the single source of truth for schema.

## Database functions and triggers

- **`handle_new_user()`** (migration 005): Runs after each insert into `auth.users`. Inserts a row into `public.profiles` with `role = 'parent'`, `access_status = 'inactive'`, and `display_name` from metadata or email. New signups get a profile automatically so the app does not need to create it on first login.

## Edge Functions

Deploy with Supabase CLI: `supabase functions deploy <name>` (requires Supabase project linked).

| Function | Purpose |
|----------|---------|
| `generate-weekly-reports` | Generates `weekly_reports` for all children for a given week. Call via HTTP POST; optional body `{ "weekStart": "YYYY-MM-DD" }`. Uses service role. Can be invoked by [Supabase Cron](https://supabase.com/docs/guides/functions/schedule-functions) (e.g. weekly on Monday). |

Deploy example:

```bash
supabase functions deploy generate-weekly-reports
```

Invoke (with anon or service role key in Authorization header if `verify_jwt` is true):

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/generate-weekly-reports" \
  -H "Authorization: Bearer <SUPABASE_ANON_OR_SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{}'
```
