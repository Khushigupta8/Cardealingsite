-- Sign-in attempt limits that work on serverless (Vercel), where functions share no memory.
-- Run once in the Supabase SQL editor. Safe to run again.

create table if not exists rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits int not null
);
alter table rate_limits enable row level security;

-- Counts one hit for p_key and returns true while it is within p_limit per window.
create or replace function rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits int;
begin
  insert into rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;

  -- Occasionally clear out old counters.
  if random() < 0.01 then
    delete from rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end $$;

-- Only the server (service role) may call it.
revoke all on function rate_limit_hit(text, int, int) from public, anon, authenticated;
