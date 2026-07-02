-- ============================================================
-- SB Mentorship App — Supabase schema (JSON-document design)
-- Run in Supabase → SQL Editor → New query → paste → Run.
--
-- Each app "collection" is one table of (id, data jsonb). The app
-- stores its objects verbatim in `data`, so the existing code works
-- unchanged. Custom login is used: the password hash lives inside
-- the users `data` blob (data->>'passwordHash').
--
-- RLS is permissive for the `anon` key here so the current
-- client-only app can read/write. >>> TIGHTEN before real production
-- (e.g. move sensitive writes behind Supabase Auth / policies). <<<
-- ============================================================

create extension if not exists "pgcrypto";

-- Generic collection tables: (id uuid pk, data jsonb, updated_at)
do $$
declare t text;
begin
  foreach t in array array[
    'departments','courses','classes','users','mentor_assignments',
    'student_profiles','semester_records','extra_credit_courses','achievements',
    'mentor_meetings','pta_meetings','progression_records','mentoring_notes',
    'signatures','audit_log','invite_tokens','password_resets',
    'wellbeing_checkins','goals','notifications','custom_fields'
  ] loop
    execute format($f$
      create table if not exists %I (
        id text primary key,
        data jsonb not null default '{}',
        updated_at timestamptz default now()
      );
    $f$, t);
    execute format('alter table %I enable row level security;', t);
    -- permissive policy for the anon key (client-only app). Tighten later.
    execute format($f$
      create policy "anon_all_%1$s" on %1$I
      for all to anon using (true) with check (true);
    $f$, t);
  end loop;
end $$;

-- Settings is a single JSON document
create table if not exists settings (
  id   int primary key default 1,
  data jsonb not null default '{}',
  constraint settings_singleton check (id = 1)
);
alter table settings enable row level security;
create policy "anon_all_settings" on settings
  for all to anon using (true) with check (true);

-- Helpful expression indexes for common lookups
create index if not exists idx_users_email on users ((lower(data->>'email')));
create index if not exists idx_users_role  on users ((data->>'role'));

-- After running this, load the app with your Supabase keys set in
-- js/supabase-config.js. The app will seed the initial admin +
-- sample data on first run (same as the localStorage version).
