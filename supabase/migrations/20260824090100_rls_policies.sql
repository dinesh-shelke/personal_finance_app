-- ============================================================================
-- Row Level Security.
--
-- This file IS the multi-user isolation guarantee. There is no server-side API
-- layer to enforce ownership, so every table below must be locked down or one
-- family member can read another's finances.
--
-- Conventions:
--   * `using` gates which rows you can see / modify.
--   * `with check` gates what a row may look like AFTER an insert or update --
--     without it, a client could hand its own row to someone else by writing a
--     different user_id.
--   * `(select auth.uid())` rather than bare `auth.uid()`: the subselect is
--     evaluated once per statement instead of once per row, which keeps the
--     index scans on `(user_id, occurred_at)` fast as history grows.
--   * `to authenticated` -- anonymous callers are never in scope.
--
-- Verified end-to-end by `npm run test:rls`, which drives two real users
-- through the API and asserts each sees exactly zero of the other's rows.
-- ============================================================================

alter table public.profiles     enable row level security;
alter table public.accounts     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;

-- Force policies to apply to the table owner too, so a future SECURITY DEFINER
-- helper cannot accidentally read across users.
alter table public.profiles     force row level security;
alter table public.accounts     force row level security;
alter table public.categories   force row level security;
alter table public.transactions force row level security;

-- Anonymous users have no business here at all; the app requires a Google login
-- before it issues a single query.
revoke all on public.profiles     from anon;
revoke all on public.accounts     from anon;
revoke all on public.categories   from anon;
revoke all on public.transactions from anon;

-- ---------------------------------------------------------------------------
-- profiles -- keyed on `id`, not `user_id`
-- ---------------------------------------------------------------------------
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

-- Insert exists only as a fallback: the signup trigger normally creates this
-- row. A user still may not fabricate a profile for anyone else.
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No delete policy: profiles die with the auth user, via `on delete cascade`.
-- Account deletion goes through the `delete-account` Edge Function.

-- ---------------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------------
create policy accounts_select_own on public.accounts
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy accounts_insert_own on public.accounts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy accounts_update_own on public.accounts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy accounts_delete_own on public.accounts
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create policy categories_select_own on public.categories
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy categories_insert_own on public.categories
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy categories_update_own on public.categories
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy categories_delete_own on public.categories
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
create policy transactions_select_own on public.transactions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy transactions_insert_own on public.transactions
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy transactions_update_own on public.transactions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy transactions_delete_own on public.transactions
  for delete to authenticated
  using (user_id = (select auth.uid()));
