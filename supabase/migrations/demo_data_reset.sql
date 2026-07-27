-- =============================================================================
-- Demo data reset — run this shortly before your presentation, not days ahead
-- =============================================================================
-- What it does:
--   1. Wipes every existing appointment record, clean slate.
--   2. Seeds 18 bookings spread across every active doctor (round-robin per
--      specialty, so this keeps working no matter how many doctors you've
--      added), with a realistic mix of statuses:
--        - 6 completed  (past visits — some further back than the admin
--          dashboard's default 5/10-day window, on purpose, so you have
--          something real to find with the new Records search)
--        - 3 cancelled  (mix of past and upcoming)
--        - 4 pending    (awaiting your confirmation — good for demoing Approve)
--        - 5 approved   (confirmed, including one today and one right now)
--   3. Three of the eighteen (Noah, Ava, and Liam) stay linked to your
--      jhelxee28@gmail.com test account — the "Villanueva family" story the
--      portal demo already tells. The other fifteen are unlinked, phone-
--      booking-style records (realistic: most families calling in won't all
--      share one account), and still show up fully on the staff side.
--   4. Every row's contact_email is your own jhelxee28@gmail.com test
--      address on purpose — if you approve, decline, cancel, or reschedule
--      any of these live during the demo, the confirmation email actually
--      lands somewhere you can show.
--
-- Not a migration — this doesn't change any table structure, only data. It's
-- filed in supabase/migrations/ purely so it lives next to the rest of the
-- project's SQL rather than floating loose.
--
-- TIMING MATTERS: every date below is calculated relative to whenever you run
-- this script — not hardcoded. Run it too far ahead of the actual meeting and
-- "today's roster" / "this week" will have drifted by the time you're
-- presenting. Running it the same day, ideally within an hour or two of the
-- meeting, keeps everything landing naturally.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Step 1: wipe every existing appointment
-- ---------------------------------------------------------------------------
delete from public.appointments;


-- ---------------------------------------------------------------------------
-- Step 2: seed 18 bookings across every active doctor
-- ---------------------------------------------------------------------------
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from public.profiles where email = 'jhelxee28@gmail.com';
  if v_user_id is null then
    raise exception 'No account found for jhelxee28@gmail.com. Register it first (or edit this script to use a different email you already have).';
  end if;

  -- Portal greeting reads legal_name — keep it matching the guardian name
  -- used on the Villanueva bookings below, so "Welcome back, Marco" lines up
  -- with what the client sees on the appointments themselves.
  update public.profiles set legal_name = 'Marco Villanueva' where id = v_user_id;

  with raw_rows (seq, day_offset, slot_time, status, service_slug, link_to_family,
                 patient_name, patient_age, guardian_name, phone, notes) as (
    values
      -- Developmental Pediatrician (6)
      (1,  -14, '09:00'::time, 'completed', 'developmental-pediatrician', true,
       'Noah Villanueva', 4, 'Marco Villanueva', '+639171234501',
       'First visit — general developmental check-in.'),
      (4,   -9, '09:45'::time, 'completed', 'developmental-pediatrician', false,
       'Mia Santos', 5, 'Carla Santos', '+639171234504',
       'Milestone tracking visit.'),
      (7,   -3, '09:00'::time, 'cancelled', 'developmental-pediatrician', false,
       'Lucas Bautista', 8, 'Diane Bautista', '+639171234507',
       'Family had a scheduling conflict.'),
      (10,   1, '13:45'::time, 'approved',  'developmental-pediatrician', false,
       'Isla Ramos', 3, 'Jun Ramos', '+639171234510',
       'New patient evaluation.'),
      (13,   4, '16:00'::time, 'cancelled', 'developmental-pediatrician', false,
       'Gabriel Aquino', 4, 'Elena Aquino', '+639171234513',
       'Family requested a later date.'),
      (16,   8, '10:30'::time, 'pending',   'developmental-pediatrician', false,
       'Layla Dela Cruz', 9, 'Rico Dela Cruz', '+639171234516',
       'General developmental review.'),

      -- Speech Therapy (6)
      (2,  -12, '10:30'::time, 'completed', 'speech-therapy', true,
       'Ava Villanueva', 7, 'Marco Villanueva', '+639171234502',
       'Some difficulty with certain sounds — teacher recommended an evaluation.'),
      (5,   -7, '11:15'::time, 'cancelled', 'speech-therapy', false,
       'Ethan Cruz', 6, 'Ana Cruz', '+639171234505',
       'Family rescheduled elsewhere.'),
      (8,   -2, '15:15'::time, 'completed', 'speech-therapy', false,
       'Zoe Garcia', 4, 'Ramon Garcia', '+639171234508',
       'Feeding therapy check-in.'),
      (11,   2, '09:45'::time, 'pending',   'speech-therapy', false,
       'Elijah Flores', 5, 'Grace Flores', '+639171234511',
       'Concerns about sound clarity, referred by preschool teacher.'),
      (14,   5, '09:00'::time, 'pending',   'speech-therapy', false,
       'Nora Rivera', 6, 'Tomas Rivera', '+639171234514',
       'Language delay follow-up requested.'),
      (17,   9, '13:00'::time, 'approved',  'speech-therapy', false,
       'Henry Domingo', 5, 'Faith Domingo', '+639171234517',
       'Language delay follow-up.'),

      -- Occupational Therapy (6)
      (3,  -10, '13:00'::time, 'completed', 'occupational-therapy', true,
       'Liam Villanueva', 2, 'Marco Villanueva', '+639171234503',
       'Follow-up on fine motor skills progress.'),
      (6,   -5, '14:30'::time, 'completed', 'occupational-therapy', false,
       'Sofia Reyes', 3, 'Paolo Reyes', '+639171234506',
       'Sensory integration session.'),
      (9,    0, '10:30'::time, 'approved',  'occupational-therapy', false,
       'Mateo Torres', 6, 'Liza Torres', '+639171234509',
       'Handwriting progress review — today.'),
      (12,   3, '11:15'::time, 'approved',  'occupational-therapy', false,
       'Chloe Mendoza', 7, 'Victor Mendoza', '+639171234512',
       'Sensory processing follow-up.'),
      (15,   6, '14:30'::time, 'approved',  'occupational-therapy', false,
       'Benjamin Castro', 2, 'Nina Castro', '+639171234515',
       'Fine motor skills evaluation.'),
      (18,  10, '15:15'::time, 'pending',   'occupational-therapy', false,
       'Aria Salazar', 3, 'Oscar Salazar', '+639171234518',
       'New referral for OT services.')
  ),
  dated_rows as (
    select
      r.*,
      -- Nudge forward a day on the rare offset that lands on a Sunday — the
      -- clinic is closed, and the no_sunday constraint would reject it.
      case when extract(dow from current_date + r.day_offset) = 0
           then current_date + r.day_offset + 1
           else current_date + r.day_offset
      end as scheduled_date,
      row_number() over (partition by r.service_slug order by r.seq) as service_rank
    from raw_rows r
  ),
  doctor_pool as (
    -- One row per active doctor, ranked within their own specialty — this is
    -- what makes the round-robin distribution work regardless of how many
    -- doctors exist per service today.
    select
      d.id, d.service_slug,
      row_number() over (partition by d.service_slug order by d.created_at, d.id) as doctor_rank,
      count(*) over (partition by d.service_slug) as doctor_count
    from public.doctors d
    where d.is_active
  )
  insert into public.appointments
    (user_id, doctor_id, service, patient_name, patient_age, guardian_name,
     contact_phone, contact_email, scheduled_date, slot_time, status, notes)
  select
    case when dr.link_to_family then v_user_id else null end,
    dp.id,
    dr.service_slug,
    dr.patient_name,
    dr.patient_age,
    dr.guardian_name,
    dr.phone,
    'jhelxee28@gmail.com',
    dr.scheduled_date,
    dr.slot_time,
    dr.status,
    dr.notes
  from dated_rows dr
  join doctor_pool dp
    on dp.service_slug = dr.service_slug
    -- Round-robin: row 1 of a service goes to doctor 1, row 2 to doctor 2,
    -- wrapping back to doctor 1 once every doctor in that specialty has had
    -- a turn. A specialty with zero active doctors simply gets none of its
    -- six rows inserted, rather than erroring the whole script.
   and dp.doctor_rank = ((dr.service_rank - 1) % dp.doctor_count) + 1;
end $$;


-- ---------------------------------------------------------------------------
-- Step 3: check it
-- ---------------------------------------------------------------------------
select status, count(*) from public.appointments group by status order by status;

select patient_name, guardian_name, service, scheduled_date, slot_time, status
from public.appointments
order by scheduled_date;
