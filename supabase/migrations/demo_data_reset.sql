-- =============================================================================
-- Demo data reset — run this shortly before your presentation, not days ahead
-- =============================================================================
-- What it does:
--   1. Removes the test bookings we created while verifying privacy/RLS
--      ("Zofhia Hafalla", "Aiyesha Tarrobal")
--   2. Seeds three clean bookings for one demo family (the Villanuevas) —
--      one child per specialty, under your existing jhelxee28@gmail.com
--      test account — telling the "one account, one coordinated plan" story
--      the homepage itself pitches.
--
-- Not a migration — this doesn't change any table structure, only data. It's
-- filed in supabase/migrations/ purely so it lives next to the rest of the
-- project's SQL rather than floating loose.
--
-- TIMING MATTERS: the three dates below are calculated relative to whenever
-- you run this script (today, a few days out, a bit further out, and a few
-- days in the past) — not hardcoded. Run it too far ahead of the actual
-- meeting and "today's roster" / "this week" will have drifted by the time
-- you're presenting. Running it the same day, ideally within an hour or two
-- of the meeting, keeps everything landing naturally.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Step 1: clear the old test bookings
-- ---------------------------------------------------------------------------
delete from public.appointments
where patient_name in ('Zofhia Hafalla', 'Aiyesha Tarrobal');


-- ---------------------------------------------------------------------------
-- Step 2: seed three clean bookings for one demo family
-- ---------------------------------------------------------------------------
do $$
declare
  v_user_id          uuid;
  v_pediatrician_id  uuid;
  v_speech_id        uuid;
  v_ot_id            uuid;
  v_past_date        date;
  v_soon_date        date;
  v_later_date       date;
begin
  select id into v_user_id from public.profiles where email = 'jhelxee28@gmail.com';
  if v_user_id is null then
    raise exception 'No account found for jhelxee28@gmail.com. Register it first (or edit this script to use a different email you already have).';
  end if;

  select id into v_pediatrician_id from public.doctors where service_slug = 'developmental-pediatrician';
  select id into v_speech_id       from public.doctors where service_slug = 'speech-therapy';
  select id into v_ot_id           from public.doctors where service_slug = 'occupational-therapy';

  -- Non-Sunday dates (the clinic is closed Sunday), calculated relative to
  -- "today" so re-running this on a different day still lands sensibly.
  select d into v_past_date
    from generate_series(current_date - 10, current_date, interval '1 day') d
    where extract(dow from d) <> 0
    order by d desc limit 1 offset 3;

  select d into v_soon_date
    from generate_series(current_date, current_date + 14, interval '1 day') d
    where extract(dow from d) <> 0
    order by d limit 1 offset 2;

  select d into v_later_date
    from generate_series(current_date, current_date + 14, interval '1 day') d
    where extract(dow from d) <> 0
    order by d limit 1 offset 5;

  -- Portal greeting reads legal_name — keep it matching the guardian name
  -- used on the bookings below, so "Welcome back, Marco" lines up with what
  -- the client sees on the appointments themselves.
  update public.profiles set legal_name = 'Marco Villanueva' where id = v_user_id;

  insert into public.appointments
    (user_id, doctor_id, service, patient_name, patient_age, guardian_name,
     contact_phone, contact_email, scheduled_date, slot_time, status, notes)
  values
    -- Confirmed and upcoming — shows as "Yours" on the timetable.
    (v_user_id, v_pediatrician_id, 'developmental-pediatrician', 'Noah Villanueva', 4,
     'Marco Villanueva', '+639171234567', 'jhelxee28@gmail.com',
     v_soon_date, '09:00', 'approved',
     'First visit — mostly want a general developmental check-in.'),

    -- Still pending — this is the one worth approving live in the meeting.
    (v_user_id, v_speech_id, 'speech-therapy', 'Ava Villanueva', 7,
     'Marco Villanueva', '+639171234567', 'jhelxee28@gmail.com',
     v_later_date, '10:30', 'pending',
     'Some difficulty with certain sounds — teacher recommended an evaluation.'),

    -- Completed, in the past — shows appointment history actually working.
    (v_user_id, v_ot_id, 'occupational-therapy', 'Liam Villanueva', 2,
     'Marco Villanueva', '+639171234567', 'jhelxee28@gmail.com',
     v_past_date, '14:30', 'completed',
     'Follow-up on fine motor skills progress.');
end $$;


-- ---------------------------------------------------------------------------
-- Step 3: check it
-- ---------------------------------------------------------------------------
select patient_name, guardian_name, service, scheduled_date, slot_time, status
from public.appointments
order by scheduled_date;
