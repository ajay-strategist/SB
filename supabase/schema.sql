-- ============================================================
-- SB Mentorship App — Hardened Database Schema & RLS Policies
-- ============================================================

-- 1. Setup Extensions
create extension if not exists "pgcrypto";

-- 2. Drop all existing policies on all tables to prevent conflicts
do $$
declare
  r record;
begin
  for r in (
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  ) loop
    execute format('drop policy %I on %I.%I;', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 3. Create core tables if they don't exist
do $$
declare t text;
begin
  foreach t in array array[
    'departments','courses','classes','users','mentor_assignments',
    'student_profiles','semester_records','extra_credit_courses','achievements',
    'mentor_meetings','pta_meetings','progression_records','mentoring_notes',
    'signatures','audit_log','invite_tokens','password_resets',
    'wellbeing_checkins','goals','notifications','custom_fields',
    'private_student_notes', 'private_teacher_notes', 'confidential_meeting_comments'
  ] loop
    execute format($f$
      create table if not exists %I (
        id text primary key,
        data jsonb not null default '{}',
        updated_at timestamptz default now()
      );
      alter table %I enable row level security;
    $f$, t, t);
  end loop;
end $$;

-- Settings singleton table
create table if not exists settings (
  id   int primary key default 1,
  data jsonb not null default '{}',
  constraint settings_singleton check (id = 1)
);
alter table settings enable row level security;

-- Indexing for lookup speed
create index if not exists idx_users_email on users ((lower(data->>'email')));
create index if not exists idx_users_role  on users ((data->>'role'));

-- 4. Helper Security Functions (SECURITY DEFINER to run safely)
create or replace function public.get_my_role()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
begin
  select (data->>'role') into user_role
  from public.users
  where id = auth.uid()::text;
  return coalesce(user_role, '');
end;
$$;

create or replace function public.is_mentor_of(student_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.mentor_assignments 
    where (data->>'mentorId') = auth.uid()::text 
      and (data->>'studentId') = student_id
  );
$$;

create or replace function public.is_in_mentor_class(student_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classes c
    join public.users u on (u.data->>'classId') = c.id
    where c.data->>'inchargeId' = auth.uid()::text 
      and u.id = student_id
  );
$$;

-- 5. Establish Row Level Security Policies

-- DEPARTMENTS, COURSES, CLASSES
create policy "read_all_depts" on departments for select to authenticated using (true);
create policy "write_admin_depts" on departments for all to authenticated using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

create policy "read_all_courses" on courses for select to authenticated using (true);
create policy "write_admin_courses" on courses for all to authenticated using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

create policy "read_all_classes" on classes for select to authenticated using (true);
create policy "write_staff_classes" on classes for all to authenticated using (public.get_my_role() in ('admin', 'principal', 'hod')) with check (public.get_my_role() in ('admin', 'principal', 'hod'));

-- USERS (Profiles)
create policy "select_users_policy" on users for select to authenticated using (
  id = auth.uid()::text
  or public.get_my_role() in ('admin', 'principal', 'hod', 'mentor')
  or (
    public.get_my_role() = 'parent'
    and id = (select data->>'linkedStudentId' from public.users where id = auth.uid()::text)
    and exists (
      select 1 from public.users student_profile 
      where student_profile.id = (select data->>'linkedStudentId' from public.users where id = auth.uid()::text)
        and (student_profile.data->>'parentApproved')::boolean = true
    )
  )
);

create policy "update_users_policy" on users for update to authenticated using (
  id = auth.uid()::text
  or public.get_my_role() in ('admin', 'principal', 'hod')
  or (public.get_my_role() = 'mentor' and public.is_mentor_of(id))
) with check (
  id = auth.uid()::text
  or public.get_my_role() in ('admin', 'principal', 'hod')
  or (public.get_my_role() = 'mentor' and public.is_mentor_of(id))
);

create policy "insert_users_policy" on users for insert to authenticated with check (
  public.get_my_role() in ('admin', 'principal', 'hod')
);

create policy "delete_users_policy" on users for delete to authenticated using (
  public.get_my_role() = 'admin'
);

-- MENTOR ASSIGNMENTS
create policy "select_assignments" on mentor_assignments for select to authenticated using (
  public.get_my_role() in ('admin', 'principal', 'hod')
  or (public.get_my_role() = 'mentor' and (data->>'mentorId') = auth.uid()::text)
  or (public.get_my_role() = 'student' and (data->>'studentId') = auth.uid()::text)
);
create policy "write_staff_assignments" on mentor_assignments for all to authenticated using (
  public.get_my_role() in ('admin', 'principal', 'hod')
) with check (
  public.get_my_role() in ('admin', 'principal', 'hod')
);

-- STUDENT PROFILES
create policy "select_student_profiles" on student_profiles for select to authenticated using (
  id = auth.uid()::text
  or public.get_my_role() in ('admin', 'principal', 'hod')
  or (public.get_my_role() = 'mentor' and (public.is_mentor_of(id) or public.is_in_mentor_class(id)))
  or (
    public.get_my_role() = 'parent'
    and id = (select data->>'linkedStudentId' from public.users where id = auth.uid()::text)
    and exists (
      select 1 from public.users student_profile 
      where student_profile.id = id 
        and (student_profile.data->>'parentApproved')::boolean = true
    )
  )
);
create policy "write_staff_student_profiles" on student_profiles for all to authenticated using (
  public.get_my_role() in ('admin', 'principal', 'hod')
  or (public.get_my_role() = 'mentor' and (public.is_mentor_of(id) or public.is_in_mentor_class(id)))
) with check (
  public.get_my_role() in ('admin', 'principal', 'hod')
  or (public.get_my_role() = 'mentor' and (public.is_mentor_of(id) or public.is_in_mentor_class(id)))
);

-- SEMESTER RECORDS, EXTRA CREDIT, ACHIEVEMENTS, PROGRESSION RECORDS, SIGNATURES
do $$
declare t text;
begin
  for t in select unnest(array['semester_records','extra_credit_courses','achievements','progression_records','signatures']) loop
    execute format($f$
      create policy "select_%1$s" on %1$I for select to authenticated using (
        (data->>'studentId') = auth.uid()::text
        or public.get_my_role() in ('admin', 'principal', 'hod')
        or (public.get_my_role() = 'mentor' and (public.is_mentor_of(data->>'studentId') or public.is_in_mentor_class(data->>'studentId')))
        or (
          public.get_my_role() = 'parent'
          and (data->>'studentId') = (select data->>'linkedStudentId' from public.users where id = auth.uid()::text)
          and exists (
            select 1 from public.users student_profile 
            where student_profile.id = (data->>'studentId') 
              and (student_profile.data->>'parentApproved')::boolean = true
          )
        )
      );
      create policy "write_%1$s" on %1$I for all to authenticated using (
        public.get_my_role() in ('admin', 'principal', 'hod')
        or (public.get_my_role() = 'mentor' and (public.is_mentor_of(data->>'studentId') or public.is_in_mentor_class(data->>'studentId')))
      ) with check (
        public.get_my_role() in ('admin', 'principal', 'hod')
        or (public.get_my_role() = 'mentor' and (public.is_mentor_of(data->>'studentId') or public.is_in_mentor_class(data->>'studentId')))
      );
    $f$, t);
  end loop;
end $$;

-- MENTOR MEETINGS
create policy "select_meetings" on mentor_meetings for select to authenticated using (
  (data->>'studentId') = auth.uid()::text
  or public.get_my_role() in ('admin', 'principal', 'hod')
  or (public.get_my_role() = 'mentor' and (data->>'mentorId') = auth.uid()::text)
  or (
    public.get_my_role() = 'parent'
    and (data->>'studentId') = (select data->>'linkedStudentId' from public.users where id = auth.uid()::text)
    and exists (
      select 1 from public.users student_profile 
      where student_profile.id = (data->>'studentId') 
        and (student_profile.data->>'parentApproved')::boolean = true
    )
  )
);
create policy "write_staff_meetings" on mentor_meetings for all to authenticated using (
  public.get_my_role() in ('admin', 'principal', 'hod')
  or (public.get_my_role() = 'mentor' and (data->>'mentorId') = auth.uid()::text)
) with check (
  public.get_my_role() in ('admin', 'principal', 'hod')
  or (public.get_my_role() = 'mentor' and (data->>'mentorId') = auth.uid()::text)
);
-- Student can request meetings
create policy "insert_student_meetings" on mentor_meetings for insert to authenticated with check (
  public.get_my_role() = 'student' and (data->>'studentId') = auth.uid()::text
);
create policy "update_student_meetings" on mentor_meetings for update to authenticated using (
  public.get_my_role() = 'student' and (data->>'studentId') = auth.uid()::text
) with check (
  public.get_my_role() = 'student' and (data->>'studentId') = auth.uid()::text
);

-- PTA MEETINGS
create policy "select_pta" on pta_meetings for select to authenticated using (
  (data->>'studentId') = auth.uid()::text
  or public.get_my_role() in ('admin', 'principal', 'hod')
  or (public.get_my_role() = 'mentor' and (public.is_mentor_of(data->>'studentId') or public.is_in_mentor_class(data->>'studentId')))
  or (
    public.get_my_role() = 'parent'
    and (data->>'studentId') = (select data->>'linkedStudentId' from public.users where id = auth.uid()::text)
    and exists (
      select 1 from public.users student_profile 
      where student_profile.id = (data->>'studentId') 
        and (student_profile.data->>'parentApproved')::boolean = true
    )
  )
);
create policy "write_staff_pta" on pta_meetings for all to authenticated using (
  public.get_my_role() in ('admin', 'principal', 'hod')
  or (public.get_my_role() = 'mentor' and (public.is_mentor_of(data->>'studentId') or public.is_in_mentor_class(data->>'studentId')))
) with check (
  public.get_my_role() in ('admin', 'principal', 'hod')
  or (public.get_my_role() = 'mentor' and (public.is_mentor_of(data->>'studentId') or public.is_in_mentor_class(data->>'studentId')))
);
-- Parent can update PTA meetings to sign/acknowledge
create policy "update_parent_pta" on pta_meetings for update to authenticated using (
  public.get_my_role() = 'parent'
  and (data->>'studentId') = (select data->>'linkedStudentId' from public.users where id = auth.uid()::text)
) with check (
  public.get_my_role() = 'parent'
  and (data->>'studentId') = (select data->>'linkedStudentId' from public.users where id = auth.uid()::text)
);

-- MENTORING NOTES (HOD/Principal/Mentor only, student/parent never read)
create policy "select_mentoring_notes" on mentoring_notes for select to authenticated using (
  public.get_my_role() in ('admin', 'principal', 'hod')
  or (public.get_my_role() = 'mentor' and (public.is_mentor_of(data->>'studentId') or public.is_in_mentor_class(data->>'studentId')))
);
create policy "write_staff_mentoring_notes" on mentoring_notes for all to authenticated using (
  public.get_my_role() in ('admin', 'principal', 'hod')
  or (public.get_my_role() = 'mentor' and (public.is_mentor_of(data->>'studentId') or public.is_in_mentor_class(data->>'studentId')))
) with check (
  public.get_my_role() in ('admin', 'principal', 'hod')
  or (public.get_my_role() = 'mentor' and (public.is_mentor_of(data->>'studentId') or public.is_in_mentor_class(data->>'studentId')))
);

-- PRIVATE STUDENT NOTES (Student only read/write)
create policy "all_private_student_notes" on private_student_notes for all to authenticated using (
  id in (select id from public.mentor_meetings where (data->>'studentId') = auth.uid()::text)
) with check (
  id in (select id from public.mentor_meetings where (data->>'studentId') = auth.uid()::text)
);

-- PRIVATE TEACHER NOTES (Teacher only read/write)
create policy "all_private_teacher_notes" on private_teacher_notes for all to authenticated using (
  id in (select id from public.mentor_meetings where (data->>'mentorId') = auth.uid()::text)
) with check (
  id in (select id from public.mentor_meetings where (data->>'mentorId') = auth.uid()::text)
);

-- CONFIDENTIAL MEETING COMMENTS (Staff only read/write)
create policy "all_confidential_comments" on confidential_meeting_comments for all to authenticated using (
  public.get_my_role() in ('admin', 'principal', 'hod')
  or (
    public.get_my_role() = 'mentor' 
    and id in (select id from public.mentor_meetings where (data->>'mentorId') = auth.uid()::text)
  )
) with check (
  public.get_my_role() in ('admin', 'principal', 'hod')
  or (
    public.get_my_role() = 'mentor' 
    and id in (select id from public.mentor_meetings where (data->>'mentorId') = auth.uid()::text)
  )
);

-- WELLBEING CHECKINS (Student own checkins; Mentor/HOD/Principal reads, parent never)
create policy "student_wellbeing" on wellbeing_checkins for all to authenticated using (
  (data->>'studentId') = auth.uid()::text
) with check (
  (data->>'studentId') = auth.uid()::text
);
create policy "staff_read_wellbeing" on wellbeing_checkins for select to authenticated using (
  public.get_my_role() in ('admin', 'principal', 'hod')
  or (public.get_my_role() = 'mentor' and (public.is_mentor_of(data->>'studentId') or public.is_in_mentor_class(data->>'studentId')))
);

-- GOALS (Student own goals; Mentor/HOD/Principal reads/updates)
create policy "student_goals" on goals for all to authenticated using (
  (data->>'studentId') = auth.uid()::text
) with check (
  (data->>'studentId') = auth.uid()::text
);
create policy "staff_goals" on goals for all to authenticated using (
  public.get_my_role() in ('admin', 'principal', 'hod')
  or (public.get_my_role() = 'mentor' and (public.is_mentor_of(data->>'studentId') or public.is_in_mentor_class(data->>'studentId')))
) with check (
  public.get_my_role() in ('admin', 'principal', 'hod')
  or (public.get_my_role() = 'mentor' and (public.is_mentor_of(data->>'studentId') or public.is_in_mentor_class(data->>'studentId')))
);

-- NOTIFICATIONS (User sees own notifications; Staff creates them)
create policy "select_notifications" on notifications for select to authenticated using (
  (data->>'userId') = auth.uid()::text
);
create policy "create_staff_notifications" on notifications for insert to authenticated with check (
  public.get_my_role() in ('admin', 'principal', 'hod', 'mentor')
);
create policy "update_own_notifications" on notifications for update to authenticated using (
  (data->>'userId') = auth.uid()::text
) with check (
  (data->>'userId') = auth.uid()::text
);

-- AUDIT LOG (Only writable via SECURE log_audit_event helper, read-only for users own events)
create policy "select_audit_log" on audit_log for select to authenticated using (
  public.get_my_role() in ('admin', 'principal')
  or (data->>'userId') = auth.uid()::text
);

-- INVITE TOKENS (Only readable/writable by Admin or anonymous verification RPC)
create policy "admin_invite_tokens" on invite_tokens for all to authenticated using (
  public.get_my_role() = 'admin'
) with check (
  public.get_my_role() = 'admin'
);

-- SETTINGS (Read-only for all logged-in, write only by Admin)
create policy "select_settings" on settings for select to authenticated using (true);
create policy "write_admin_settings" on settings for all to authenticated using (
  public.get_my_role() = 'admin'
) with check (
  public.get_my_role() = 'admin'
);


-- 6. Secure Server-Side Administrative RPCs

-- admin_create_user: Invites / signs up a user under Supabase Auth and creates their public profile
create or replace function public.admin_create_user(
  p_email text,
  p_name text,
  p_role text,
  p_department_id text,
  p_course_id text,
  p_class_id text,
  p_parent_email text,
  p_linked_student_id text,
  p_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  new_uid uuid;
  temp_pwd text;
  hashed_pwd text;
  token text;
  result jsonb;
begin
  -- Authorization check: Only admins can invoke this
  if not exists (
    select 1 from public.users 
    where id = auth.uid()::text and (data->>'role' = 'admin')
  ) then
    raise exception 'Unauthorized: Only admins can invite users.';
  end if;

  if p_email is null or p_email = '' then
    raise exception 'Email is required.';
  end if;

  -- Normalize email
  p_email := lower(trim(p_email));

  if exists (select 1 from auth.users where email = p_email) then
    raise exception 'A user with this email already exists.';
  end if;

  new_uid := extensions.gen_random_uuid();
  -- Generate a random 16-character temporary password
  temp_pwd := extensions.translate(extensions.encode(extensions.gen_random_bytes(12), 'base64'), '+/=', 'xyz');
  hashed_pwd := extensions.crypt(temp_pwd, extensions.gen_salt('bf'));
  token := extensions.encode(extensions.gen_random_bytes(16), 'hex');

  -- Create record in auth.users
  insert into auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  )
  values (
    new_uid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    p_email,
    hashed_pwd,
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    json_build_object('role', p_role)::jsonb,
    'authenticated',
    'authenticated'
  );

  -- Create primary identity linked to email provider
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    extensions.gen_random_uuid(),
    new_uid,
    json_build_object('sub', new_uid, 'email', p_email)::jsonb,
    'email',
    now(),
    now(),
    now()
  );

  -- Create profile record in public.users
  insert into public.users (id, data)
  values (
    new_uid::text,
    json_build_object(
      'id', new_uid::text,
      'email', p_email,
      'name', p_name,
      'role', p_role,
      'status', 'invited',
      'departmentId', p_department_id,
      'courseId', p_course_id,
      'classId', p_class_id,
      'phone', p_phone,
      'parentEmail', p_parent_email,
      'linkedStudentId', p_linked_student_id,
      'createdAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'updatedAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  );

  -- Create active invite token
  insert into public.invite_tokens (id, data)
  values (
    token,
    json_build_object(
      'id', token,
      'token', token,
      'userId', new_uid::text,
      'email', p_email,
      'tempPassword', temp_pwd,
      'expiresAt', extract(epoch from (now() + interval '7 days')) * 1000,
      'used', false,
      'createdAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  );

  result := json_build_object(
    'ok', true,
    'userId', new_uid::text,
    'token', token,
    'tempPassword', temp_pwd
  )::jsonb;

  return result;
end;
$$;


-- redeem_invite_token: Validates token anonymously and returns temp sign-in credentials
create or replace function public.redeem_invite_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  token_record record;
  token_data jsonb;
  result jsonb;
begin
  select * into token_record from public.invite_tokens where id = p_token;
  
  if not found then
    raise exception 'Invalid activation link.';
  end if;
  
  token_data := token_record.data;
  
  if (token_data->>'used')::boolean = true then
    raise exception 'Activation link has already been used.';
  end if;
  
  if (token_data->>'expiresAt')::numeric < extract(epoch from now()) * 1000 then
    raise exception 'Activation link has expired.';
  end if;
  
  result := json_build_object(
    'ok', true,
    'email', token_data->>'email',
    'tempPassword', token_data->>'tempPassword',
    'userId', token_data->>'userId'
  )::jsonb;
  
  return result;
end;
$$;


-- mark_invite_token_used: Marks token used on active sign-in (invoked post auth verification)
create or replace function public.mark_invite_token_used(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  token_record record;
  token_data jsonb;
begin
  select * into token_record from public.invite_tokens where id = p_token;
  if not found then
    return false;
  end if;
  
  token_data := token_record.data;
  token_data := jsonb_set(token_data, '{used}', 'true'::jsonb);
  
  update public.invite_tokens 
  set data = token_data, updated_at = now()
  where id = p_token;
  
  return true;
end;
$$;


-- log_audit_event: Server-side log generator ensuring logs are tamper-proof and append-only
create or replace function public.log_audit_event(p_action text, p_target text)
returns boolean
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  log_id text;
begin
  if auth.uid() is null then
    return false;
  end if;
  
  log_id := extensions.encode(extensions.gen_random_bytes(16), 'hex');
  
  insert into public.audit_log (id, data)
  values (
    log_id,
    json_build_object(
      'id', log_id,
      'timestamp', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'userId', auth.uid()::text,
      'action', p_action,
      'target', p_target
    )
  );
  
  return true;
end;
$$;


-- ============================================================
-- secure_settings table & RLS policies
-- ============================================================
create table if not exists secure_settings (
  id   int primary key default 1,
  data jsonb not null default '{}',
  constraint secure_settings_singleton check (id = 1)
);
alter table secure_settings enable row level security;

create policy "select_secure_settings" on secure_settings for select to authenticated using (
  public.get_my_role() in ('admin', 'principal', 'hod', 'mentor')
);
create policy "write_secure_settings" on secure_settings for all to authenticated using (
  public.get_my_role() in ('admin', 'principal', 'hod', 'mentor')
) with check (
  public.get_my_role() in ('admin', 'principal', 'hod', 'mentor')
);


-- ============================================================
-- 7. Seed test users in Supabase Auth & public.users (for development and testing)
-- ============================================================
do $$
declare
  admin_uid uuid := 'a1a1a1a1-a1a1-41a1-a1a1-a1a1a1a1a111'::uuid;
  mentor1_uid uuid := 'b1b1b1b1-b1b1-41b1-b1b1-b1b1b1b1b111'::uuid;
  mentor2_uid uuid := 'b2b2b2b2-b2b2-42b2-b2b2-b2b2b2b2b222'::uuid;
  hod1_uid uuid := 'c1c1c1c1-c1c1-41c1-c1c1-c1c1c1c1c111'::uuid;
  student1_uid uuid := 'd1d1d1d1-d1d1-41d1-d1d1-d1d1d1d1d111'::uuid;
  student2_uid uuid := 'd2d2d2d2-d2d2-42d2-d2d2-d2d2d2d2d222'::uuid;
  student3_uid uuid := 'd3d3d3d3-d3d3-43d3-d3d3-d3d3d3d3d333'::uuid;
  student4_uid uuid := 'd4d4d4d4-d4d4-44d4-d4d4-d4d4d4d4d444'::uuid;
  parent1_uid uuid := 'e1e1e1e1-e1e1-41e1-e1e1-e1e1e1e1e111'::uuid;
begin
  -- Seeding auth.users
  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role) values
    (admin_uid, '00000000-0000-0000-0000-000000000000'::uuid, 'admin@sbc.edu', extensions.crypt('Admin@1234', extensions.gen_salt('bf', 10)), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"admin"}'::jsonb, 'authenticated', 'authenticated'),
    (mentor1_uid, '00000000-0000-0000-0000-000000000000'::uuid, 'mentor.priya@sbc.edu', extensions.crypt('Mentor@123', extensions.gen_salt('bf', 10)), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"mentor"}'::jsonb, 'authenticated', 'authenticated'),
    (mentor2_uid, '00000000-0000-0000-0000-000000000000'::uuid, 'mentor.joseph@sbc.edu', extensions.crypt('Mentor@123', extensions.gen_salt('bf', 10)), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"mentor"}'::jsonb, 'authenticated', 'authenticated'),
    (hod1_uid, '00000000-0000-0000-0000-000000000000'::uuid, 'hod.science@sbc.edu', extensions.crypt('HOD@1234', extensions.gen_salt('bf', 10)), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"hod"}'::jsonb, 'authenticated', 'authenticated'),
    (student1_uid, '00000000-0000-0000-0000-000000000000'::uuid, 'anjali.krishna@gmail.com', extensions.crypt('Student@123', extensions.gen_salt('bf', 10)), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"student"}'::jsonb, 'authenticated', 'authenticated'),
    (student2_uid, '00000000-0000-0000-0000-000000000000'::uuid, 'rahul.menon@gmail.com', extensions.crypt('Student@123', extensions.gen_salt('bf', 10)), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"student"}'::jsonb, 'authenticated', 'authenticated'),
    (student3_uid, '00000000-0000-0000-0000-000000000000'::uuid, 'sneha.pillai@gmail.com', extensions.crypt('Student@123', extensions.gen_salt('bf', 10)), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"student"}'::jsonb, 'authenticated', 'authenticated'),
    (student4_uid, '00000000-0000-0000-0000-000000000000'::uuid, 'arjun.babu@gmail.com', extensions.crypt('Student@123', extensions.gen_salt('bf', 10)), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"student"}'::jsonb, 'authenticated', 'authenticated'),
    (parent1_uid, '00000000-0000-0000-0000-000000000000'::uuid, 'krishna.parent@gmail.com', extensions.crypt('Parent@123', extensions.gen_salt('bf', 10)), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"parent"}'::jsonb, 'authenticated', 'authenticated')
  on conflict (id) do nothing;

  -- Seeding auth.identities
  insert into auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select extensions.gen_random_uuid(), id, json_build_object('sub', id, 'email', email)::jsonb, 'email', now(), now(), now()
  from auth.users
  where id in (admin_uid, mentor1_uid, mentor2_uid, hod1_uid, student1_uid, student2_uid, student3_uid, student4_uid, parent1_uid)
    and not exists (select 1 from auth.identities where user_id = auth.users.id)
  on conflict do nothing;
end $$;

