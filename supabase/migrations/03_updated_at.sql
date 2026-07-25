-- =============================================================================
-- 03 — Keep updated_at honest
-- =============================================================================
-- `default now()` only fires on INSERT. Without this trigger, updated_at would
-- be frozen at creation time and quietly lie to you forever.
-- =============================================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger appointments_touch
  before update on public.appointments
  for each row execute function public.touch_updated_at();
