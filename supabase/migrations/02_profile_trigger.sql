-- =============================================================================
-- 02 — Auto-create the profile row on signup
-- =============================================================================
-- The alternative is to call supabase.auth.signUp(), wait for it to succeed,
-- then run a second INSERT into profiles from your app. That works right up
-- until the browser closes, the network drops, or the tab crashes between the
-- two calls — leaving an account that can log in but has no profile.
--
-- Letting the database do it means both rows are created in the same
-- transaction. Either the whole signup succeeds, or none of it does.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
-- security definer: runs with the function owner's privileges, so it can write
-- to public.profiles even though the signing-up user has no session yet.
security definer
-- Hardening that matters specifically for security definer functions: with an
-- empty search_path, every reference must be fully qualified (public.profiles),
-- so nobody can shadow a table name and hijack what this function touches.
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, legal_name, date_of_birth, sex, residence, phone)
  values (
    new.id,
    new.email,
    -- These come from the `options.data` object passed to supabase.auth.signUp().
    -- Supabase stores that JSON as raw_user_meta_data on the auth user.
    new.raw_user_meta_data ->> 'legal_name',
    (new.raw_user_meta_data ->> 'date_of_birth')::date,
    new.raw_user_meta_data ->> 'sex',
    new.raw_user_meta_data ->> 'residence',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates the public.profiles row from signUp metadata, in the same transaction as the auth user.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- If your app forgets to send one of these fields, the NOT NULL constraint on
-- profiles fails and the entire signup rolls back with an error. That is the
-- behaviour you want: a loud failure beats a half-created account.
