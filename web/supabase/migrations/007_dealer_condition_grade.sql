-- Dealers rate their own vehicle's condition (1-5) when they submit it; the review team prices it
-- from that rating, the notes and the photos, and the rating is copied onto the review when it's completed.
-- Run once in the Supabase SQL editor (after 001–006). Safe to run again.

alter table vehicles add column if not exists condition_grade smallint check (condition_grade between 1 and 5);
