-- Stripe membership: per-dealership plan agreed before activation, subscription state, and
-- site-wide switches. Run once in the Supabase SQL editor (after 001–003). Safe to run again.

-- ---------- Per-dealership plan and subscription ----------
alter table dealerships add column if not exists plan_amount_cents int check (plan_amount_cents is null or plan_amount_cents > 0);
alter table dealerships add column if not exists plan_interval text check (plan_interval is null or plan_interval in ('month', 'year'));
alter table dealerships add column if not exists stripe_price_id text;
-- Complimentary: no payment needed even when membership is required.
alter table dealerships add column if not exists billing_exempt boolean not null default false;
alter table dealerships add column if not exists stripe_customer_id text unique;
alter table dealerships add column if not exists stripe_subscription_id text;
alter table dealerships add column if not exists subscription_status text;
alter table dealerships add column if not exists current_period_end timestamptz;
alter table dealerships add column if not exists cancel_at_period_end boolean not null default false;
-- When the subscription first went past_due; the grace period counts from here.
alter table dealerships add column if not exists past_due_since timestamptz;

-- ---------- Site-wide settings ----------
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;

-- Membership starts switched off so nothing changes until an admin turns it on.
insert into app_settings (key, value) values
  ('membership_required', 'false'::jsonb),
  ('grace_days', '7'::jsonb)
on conflict (key) do nothing;
