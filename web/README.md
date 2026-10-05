# Dealer Review

Next.js 16 app on Vercel with Supabase (Postgres, Auth, Storage). One project holds the
marketing site, the admin console, the dealer workspace and the JSON API.

| Path | What |
|---|---|
| `/` | Marketing homepage |
| `/admin` | Review team console: queue, grading, invitations, people |
| `/portal` | Dealer workspace: submit vehicles, answer requests, see reviews |
| `/activate`, `/reset-password` | Where invitation and reset emails land |
| `/api/v1/*` | JSON API with Bearer tokens; any other frontend can use it the same way |

## Setup

1. In the Supabase SQL editor, run each file in `supabase/migrations/` in order (`001` to `006`).
2. In **Authentication → URL Configuration**, set the Site URL to the production URL and add
   `<url>/activate` and `<url>/reset-password` (plus the `http://localhost:3000` versions) to Redirect URLs.
3. Copy `.env.example` to `.env.local` and fill in the Supabase keys.
4. Install and run:

```bash
npm install
npm run dev        # http://localhost:3000
```

The first admin is created from Supabase: add a user under **Authentication → Users**, then
`insert into profiles (id, role, activated_at) values ('<user id>', 'admin', now());`

## Deploy

Linked to the Vercel project `devon-dealer-review-video-v5-1`. Functions run in `hnd1` (Tokyo),
next to the Supabase database (`vercel.json`). Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `PHOTO_BUCKET`, `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Vercel
(plus `RESEND_API_KEY` and `EMAIL_FROM` for app emails); `APP_URL` defaults to the production URL.

```bash
npx vercel deploy --prod
```

## Notes

- Photos upload straight from the browser to Supabase Storage with one-time URLs
  (`POST /vehicles/:id/photos/uploads`, then `POST /vehicles/:id/photos`), so they bypass
  Vercel's ~4.5 MB request limit.
- Sign-in attempts are rate limited per IP in Postgres (`rate_limit_hit`), since serverless
  functions share no memory. Without the migration the check is skipped and a warning is logged.
- Supabase's built-in email sender allows only a few emails per hour; connect custom SMTP
  (e.g. Resend) under **Authentication → Emails** before inviting real dealers. Until then,
  **People → Copy link** gives an admin a one-time sign-in link without email.
