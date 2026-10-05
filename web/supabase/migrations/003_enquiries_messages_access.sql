-- Enquiries from the public site, a message thread per vehicle, and disabling accounts.
-- Run once in the Supabase SQL editor (after 001 and 002). Safe to run again.

-- ---------- Enquiries ("Request an invitation" on the homepage) ----------
do $$ begin
  create type enquiry_status as enum ('new', 'contacted', 'invited', 'closed');
exception when duplicate_object then null; end $$;

create table if not exists enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  dealership text not null,
  email text not null,
  phone text,
  location text,
  monthly_volume text,
  message text,
  status enquiry_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists enquiries_status_idx on enquiries (status, created_at desc);
alter table enquiries enable row level security;

drop trigger if exists enquiries_touch on enquiries;
create trigger enquiries_touch before update on enquiries
  for each row execute function touch_updated_at();

-- ---------- Message thread per vehicle ----------
create table if not exists vehicle_messages (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  author_id uuid references profiles (id) on delete set null,
  author_role user_role not null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists vehicle_messages_vehicle_idx on vehicle_messages (vehicle_id, created_at);
alter table vehicle_messages enable row level security;

-- ---------- Disable / re-enable an account ----------
alter table profiles add column if not exists disabled_at timestamptz;
