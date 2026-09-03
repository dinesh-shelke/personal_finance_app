-- ============================================================================
-- Recurring transactions (MF-14)
--
-- A schedule is a template, not a ledger entry: nothing is counted until a real
-- row lands in `transactions`. Posting is therefore an explicit act, performed
-- by `post_due_recurring()` when the app opens.
--
-- Why catch-up on open rather than a cron: Supabase's free tier has no
-- scheduler, and a phone that has not been opened for a fortnight still needs
-- its rent entries. The function walks every missed occurrence, so the ledger
-- ends up identical either way.
-- ============================================================================

create type public.recurrence_frequency as enum ('daily', 'weekly', 'monthly', 'yearly');

comment on type public.recurrence_frequency is
  'Unit of the repeat interval. Combined with interval_count: (2, weekly) is fortnightly.';

-- ---------------------------------------------------------------------------
-- recurrence_nth -- the date of the nth occurrence, counting the first as 0
--
-- Always measured from `starts_on` rather than by repeatedly advancing the
-- previous date, because repeated addition drifts: a schedule starting 31 Jan
-- would land on 28 Feb, then 28 Mar, and every later month would be wrong.
-- Measuring from the start clamps only the short months (28 Feb, then 31 Mar).
-- ---------------------------------------------------------------------------
create or replace function public.recurrence_nth(
  starts_on       date,
  frequency       public.recurrence_frequency,
  interval_count  integer,
  n               integer
)
returns date
language sql
immutable
set search_path = ''
as $fn$
  select starts_on + case frequency
    when 'daily'   then make_interval(days   => interval_count * n)
    when 'weekly'  then make_interval(weeks  => interval_count * n)
    when 'monthly' then make_interval(months => interval_count * n)
    when 'yearly'  then make_interval(years  => interval_count * n)
  end;
$fn$;

comment on function public.recurrence_nth is
  'Date of the nth occurrence (n = 0 is the first), measured from starts_on to avoid month-end drift.';

-- ---------------------------------------------------------------------------
-- recurring_transactions -- the schedules
--
-- Columns describing the money mirror `transactions` exactly, including the
-- shape constraint, so a schedule cannot describe a transaction the ledger
-- would reject.
-- ---------------------------------------------------------------------------
create table public.recurring_transactions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  account_id          uuid not null,
  category_id         uuid,
  transfer_account_id uuid,
  type                public.transaction_type not null,
  amount              numeric(14, 2) not null,
  note                text,

  frequency           public.recurrence_frequency not null,
  interval_count      integer not null default 1,
  starts_on           date not null,
  ends_on             date,

  -- How many occurrences have been written to the ledger. The next due date is
  -- always recurrence_nth(starts_on, frequency, interval_count, posted_count).
  posted_count        integer not null default 0,
  last_posted_at      timestamptz,
  is_paused           boolean not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint recurring_amount_positive check (amount > 0),
  constraint recurring_amount_sane check (amount <= 999999999999.99),
  constraint recurring_note_length check (note is null or length(note) <= 500),
  constraint recurring_interval_sane check (interval_count between 1 and 366),
  constraint recurring_posted_count_sane check (posted_count >= 0),
  constraint recurring_ends_after_start check (ends_on is null or ends_on >= starts_on),

  -- Identical to transactions_shape: a transfer names a different destination
  -- and carries no category; income and expense name no destination.
  constraint recurring_shape check (
    case type
      when 'transfer' then
        transfer_account_id is not null
        and transfer_account_id <> account_id
        and category_id is null
      else
        transfer_account_id is null
    end
  ),

  constraint recurring_account_same_user
    foreign key (account_id, user_id) references public.accounts (id, user_id)
    on delete cascade,

  constraint recurring_transfer_account_same_user
    foreign key (transfer_account_id, user_id) references public.accounts (id, user_id)
    on delete cascade,

  constraint recurring_category_same_user
    foreign key (category_id, user_id) references public.categories (id, user_id)
    on delete set null (category_id)
);

comment on table public.recurring_transactions is
  'Templates that post into transactions on a schedule. Posting happens via post_due_recurring().';
comment on column public.recurring_transactions.posted_count is
  'Occurrences already written to the ledger. Drives the next due date; never decremented.';
comment on column public.recurring_transactions.is_paused is
  'Paused schedules keep their history and position but post nothing.';

create trigger recurring_transactions_set_updated_at
  before update on public.recurring_transactions
  for each row execute function public.set_updated_at();

-- Posting scans by user and pause state; the date is computed, so it cannot be
-- indexed directly without a generated column. The table stays small enough
-- (a handful of rows per user) that this is the right trade.
create index recurring_user_active_idx
  on public.recurring_transactions (user_id)
  where not is_paused;

-- ---------------------------------------------------------------------------
-- Row Level Security -- same shape as every other table
-- ---------------------------------------------------------------------------
alter table public.recurring_transactions enable row level security;
alter table public.recurring_transactions force row level security;
revoke all on public.recurring_transactions from anon;

create policy recurring_select_own on public.recurring_transactions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy recurring_insert_own on public.recurring_transactions
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy recurring_update_own on public.recurring_transactions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy recurring_delete_own on public.recurring_transactions
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- post_due_recurring -- write every occurrence that is now in the past
--
-- `security invoker`, so RLS applies exactly as it would to the app's own
-- inserts: a caller can only ever post their own schedules into their own
-- ledger. That is the whole safety argument, and `npm run test:rls` checks it.
--
-- Returns the number of transactions written, so the client can decide whether
-- to invalidate its caches.
-- ---------------------------------------------------------------------------
create or replace function public.post_due_recurring()
returns integer
language plpgsql
volatile
security invoker
set search_path = ''
as $fn$
declare
  rule     public.recurring_transactions%rowtype;
  due_on   date;
  written  integer := 0;
  guard    integer;
begin
  for rule in
    select *
      from public.recurring_transactions
     where user_id = (select auth.uid())
       and not is_paused
     for update
  loop
    -- A schedule left unopened for years must not spin here. 500 occurrences
    -- is longer than any realistic gap, and the remainder posts next time.
    guard := 0;

    loop
      due_on := public.recurrence_nth(
        rule.starts_on, rule.frequency, rule.interval_count, rule.posted_count
      );

      exit when due_on > current_date;
      exit when rule.ends_on is not null and due_on > rule.ends_on;
      exit when guard >= 500;

      insert into public.transactions (
        user_id, account_id, category_id, transfer_account_id,
        type, amount, occurred_at, note
      )
      values (
        rule.user_id, rule.account_id, rule.category_id, rule.transfer_account_id,
        rule.type, rule.amount, due_on::timestamptz, rule.note
      );

      rule.posted_count := rule.posted_count + 1;
      written := written + 1;
      guard := guard + 1;
    end loop;

    if guard > 0 then
      update public.recurring_transactions
         set posted_count   = rule.posted_count,
             last_posted_at = now()
       where id = rule.id;
    end if;
  end loop;

  return written;
end;
$fn$;

comment on function public.post_due_recurring is
  'Writes every past-due occurrence of the caller''s schedules into transactions. Returns rows written.';

revoke all on function public.post_due_recurring() from anon;
grant execute on function public.post_due_recurring() to authenticated;
