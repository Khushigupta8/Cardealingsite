-- Unread messages: when each side (the dealership, the review team) last read a vehicle's thread.
-- Run once in the Supabase SQL editor (after 001–005). Safe to run again.

create table if not exists message_reads (
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  side text not null check (side in ('dealer', 'team')),
  read_at timestamptz not null default now(),
  primary key (vehicle_id, side)
);
alter table message_reads enable row level security;

-- Start with every existing conversation marked read, so only new messages show as unread.
insert into message_reads (vehicle_id, side, read_at)
select v.id, s.side, now() from vehicles v cross join (values ('dealer'), ('team')) as s(side)
on conflict do nothing;
