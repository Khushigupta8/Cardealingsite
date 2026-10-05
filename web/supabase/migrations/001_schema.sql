-- Dealer Review schema. Run once in the Supabase SQL editor.
-- The API talks to the database with the service role key, so RLS is enabled with
-- no policies: direct access with the public anon key sees nothing.

create type user_role as enum ('dealer', 'reviewer', 'admin');
create type vehicle_status as enum ('pending', 'needs_info', 'completed');

create table dealerships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- One row per auth user. Dealers belong to exactly one dealership.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null,
  dealership_id uuid references dealerships (id) on delete restrict,
  full_name text,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint dealer_has_dealership check (role <> 'dealer' or dealership_id is not null)
);

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references dealerships (id) on delete cascade,
  submitted_by uuid references profiles (id) on delete set null,
  vin text not null check (char_length(vin) = 17),
  year int not null check (year between 1900 and 2100),
  make text not null,
  model text not null,
  trim text,
  mileage int not null check (mileage >= 0),
  condition_notes text,
  asking_price numeric(12, 2) check (asking_price >= 0),
  status vehicle_status not null default 'pending',
  -- The reviewer's latest request when status is needs_info.
  info_request text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index vehicles_dealership_status_idx on vehicles (dealership_id, status, submitted_at desc);
create index vehicles_status_idx on vehicles (status, submitted_at);

create table vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  storage_path text not null unique,
  uploaded_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index vehicle_photos_vehicle_idx on vehicle_photos (vehicle_id, created_at);

create table reviews (
  vehicle_id uuid primary key references vehicles (id) on delete cascade,
  reviewer_id uuid references profiles (id) on delete set null,
  condition_grade smallint not null check (condition_grade between 1 and 5),
  recommended_price numeric(12, 2) not null check (recommended_price >= 0),
  notes text,
  graded_at timestamptz not null default now()
);

create function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger vehicles_touch before update on vehicles
  for each row execute function touch_updated_at();

alter table dealerships enable row level security;
alter table profiles enable row level security;
alter table vehicles enable row level security;
alter table vehicle_photos enable row level security;
alter table reviews enable row level security;

-- Private bucket for vehicle photos; the API hands out short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-photos', 'vehicle-photos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic']);
