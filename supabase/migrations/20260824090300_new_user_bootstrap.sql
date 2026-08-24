-- ============================================================================
-- New-user bootstrap.
--
-- When a family member signs in with Google for the first time, Supabase
-- inserts a row into auth.users. This trigger turns that into a usable account:
-- a profile, a "Cash" wallet, and a starter set of categories -- so the very
-- first screen they see has something to tap rather than an empty picker.
--
-- SECURITY DEFINER is required: the trigger runs during signup, before the user
-- has a session, so `auth.uid()` is NULL and the RLS policies would reject
-- every insert. `search_path = ''` prevents search-path hijacking, which is why
-- every identifier below is schema-qualified.
--
-- Every insert is `on conflict do nothing`, so a retried signup (or a manual
-- re-run for an existing user) is a no-op rather than a duplicate-key error.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  -- ---- profile -----------------------------------------------------------
  -- Google returns the display name under `full_name` (and sometimes `name`);
  -- fall back to the local part of the email so the greeting is never blank.
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    nullif(
      btrim(
        coalesce(
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'name',
          split_part(coalesce(new.email, ''), '@', 1)
        )
      ),
      ''
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  -- ---- default account ---------------------------------------------------
  insert into public.accounts (user_id, name, type, icon, color, sort_order)
  values (new.id, 'Cash', 'cash', 'wallet-outline', '#0B3B4C', 0)
  on conflict (user_id, name) do nothing;

  -- ---- starter categories ------------------------------------------------
  -- `icon` values are Ionicons names, resolved by @expo/vector-icons in the
  -- client. `is_system` marks these as seeded so the UI can warn before delete.
  insert into public.categories (user_id, name, kind, icon, color, is_system, sort_order)
  values
    -- income
    (new.id, 'Salary',            'income',  'cash-outline',              '#12B76A', true, 10),
    (new.id, 'Business',          'income',  'briefcase-outline',         '#15B79E', true, 20),
    (new.id, 'Freelance',         'income',  'laptop-outline',            '#2E90FA', true, 30),
    (new.id, 'Interest',          'income',  'trending-up-outline',       '#7A5AF8', true, 40),
    (new.id, 'Rental Income',     'income',  'business-outline',          '#0B3B4C', true, 50),
    (new.id, 'Gift',              'income',  'gift-outline',              '#EE46BC', true, 60),
    (new.id, 'Refund',            'income',  'return-down-back-outline',  '#6B7A99', true, 70),
    (new.id, 'Other Income',      'income',  'ellipsis-horizontal-outline','#AEB6C4', true, 80),
    -- expense
    (new.id, 'Food & Drinks',     'expense', 'restaurant-outline',        '#F79009', true, 10),
    (new.id, 'Groceries',         'expense', 'basket-outline',            '#12B76A', true, 20),
    (new.id, 'Rent',              'expense', 'home-outline',              '#0B3B4C', true, 30),
    (new.id, 'Transport',         'expense', 'car-outline',               '#2E90FA', true, 40),
    (new.id, 'Fuel',              'expense', 'speedometer-outline',       '#854A0E', true, 50),
    (new.id, 'Bills & Utilities', 'expense', 'receipt-outline',           '#7A5AF8', true, 60),
    (new.id, 'Mobile & Internet', 'expense', 'wifi-outline',              '#15B79E', true, 70),
    (new.id, 'Health',            'expense', 'medkit-outline',            '#F04438', true, 80),
    (new.id, 'Shopping',          'expense', 'bag-handle-outline',        '#EE46BC', true, 90),
    (new.id, 'Entertainment',     'expense', 'game-controller-outline',   '#7A5AF8', true, 100),
    (new.id, 'Education',         'expense', 'school-outline',            '#2E90FA', true, 110),
    (new.id, 'EMI & Loans',       'expense', 'card-outline',              '#F04438', true, 120),
    (new.id, 'Insurance',         'expense', 'shield-checkmark-outline',  '#0B3B4C', true, 130),
    (new.id, 'Investment',        'expense', 'stats-chart-outline',       '#12B76A', true, 140),
    (new.id, 'Travel',            'expense', 'airplane-outline',          '#15B79E', true, 150),
    (new.id, 'Family',            'expense', 'people-outline',            '#F79009', true, 160),
    (new.id, 'Other Expense',     'expense', 'ellipsis-horizontal-outline','#AEB6C4', true, 170)
  on conflict (user_id, kind, name) do nothing;

  return new;
end;
$fn$;

comment on function public.handle_new_user is
  'Seeds a profile, a Cash account and starter categories for each new signup. Idempotent.';

-- `after insert` rather than `before`: the auth.users row must exist before the
-- foreign keys in public.profiles / public.accounts can reference it.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only Postgres itself should ever call this; it bypasses RLS by design.
revoke all on function public.handle_new_user() from anon, authenticated;
