-- Record when a dealer accepted the membership terms, and which version.
-- Run once in the Supabase SQL editor (after 001–004). Safe to run again.
alter table profiles add column if not exists terms_accepted_at timestamptz;
alter table profiles add column if not exists terms_version text;
