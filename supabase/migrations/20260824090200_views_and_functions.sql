-- ============================================================================
-- Derived reads: balances and summaries.
--
-- All aggregation lives here rather than in the client, for two reasons:
--   1. `numeric` addition in Postgres is exact; JavaScript float addition is not.
--   2. Summing on the server means the phone downloads one row, not ten thousand.
--
-- Everything below is `security_invoker` / `security invoker`, so the caller's
-- RLS policies still apply -- these are convenience shapes, not a way around
-- the isolation rules in 20260824090100_rls_policies.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- account_balances -- live balance per account
--
-- balance = opening_balance
--         + income into the account
--         + transfers received
--         - expenses from the account
--         - transfers sent
--
-- Note each `sum(...) filter (...)` is individually coalesced: a bare
-- `sum(a) + sum(b)` is NULL when either side matched no rows, which would blank
-- out the balance of any account that has only ever received money.
-- ---------------------------------------------------------------------------
create view public.account_balances
with (security_invoker = true) as
select
  a.id      as account_id,
  a.user_id,
  a.name,
  a.type,
  a.color,
  a.icon,
  a.is_archived,
  a.sort_order,
  a.opening_balance,
  (a.opening_balance + m.inflow - m.outflow)::numeric(14, 2) as balance,
  m.inflow,
  m.outflow,
  m.transaction_count,
  m.last_transaction_at
from public.accounts a
left join lateral (
  select
    coalesce(sum(t.amount) filter (where t.type = 'income' and t.account_id = a.id), 0)
      + coalesce(sum(t.amount) filter (where t.type = 'transfer' and t.transfer_account_id = a.id), 0)
      as inflow,
    coalesce(sum(t.amount) filter (where t.type = 'expense' and t.account_id = a.id), 0)
      + coalesce(sum(t.amount) filter (where t.type = 'transfer' and t.account_id = a.id), 0)
      as outflow,
    count(*) as transaction_count,
    max(t.occurred_at) as last_transaction_at
  from public.transactions t
  where t.user_id = a.user_id
    and (t.account_id = a.id or t.transfer_account_id = a.id)
) m on true;

comment on view public.account_balances is
  'Live per-account balance. Read this instead of accounts when a balance is needed.';

-- ---------------------------------------------------------------------------
-- net_worth -- single row: everything the caller owns, minus what they owe
--
-- Transfers are deliberately absent: moving money between your own accounts
-- cannot change your net worth, and the two legs cancel in account_balances.
-- ---------------------------------------------------------------------------
create view public.net_worth
with (security_invoker = true) as
select
  b.user_id,
  coalesce(sum(b.balance), 0)::numeric(14, 2) as total_balance,
  coalesce(sum(b.balance) filter (where b.balance > 0), 0)::numeric(14, 2) as total_assets,
  coalesce(sum(b.balance) filter (where b.balance < 0), 0)::numeric(14, 2) as total_liabilities,
  count(*) as account_count
from public.account_balances b
where not b.is_archived
group by b.user_id;

comment on view public.net_worth is
  'One row per user: the headline figure on the dashboard. Archived accounts excluded.';

-- ---------------------------------------------------------------------------
-- monthly_summary(from, to) -- income / expense / net for a period
--
-- `stable` (not `volatile`) so Postgres can cache it within a statement, and
-- `security invoker` so the caller's RLS still filters the rows. The explicit
-- `user_id = auth.uid()` is redundant under RLS but documents the intent and
-- lets the planner use the (user_id, occurred_at) index directly.
-- ---------------------------------------------------------------------------
create or replace function public.monthly_summary(
  p_from timestamptz,
  p_to   timestamptz
)
returns table (
  income            numeric,
  expense           numeric,
  net               numeric,
  transaction_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $fn$
  select
    coalesce(sum(t.amount) filter (where t.type = 'income'), 0)::numeric(14, 2)  as income,
    coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)::numeric(14, 2) as expense,
    (
      coalesce(sum(t.amount) filter (where t.type = 'income'), 0)
      - coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)
    )::numeric(14, 2) as net,
    count(*) filter (where t.type <> 'transfer') as transaction_count
  from public.transactions t
  where t.user_id = (select auth.uid())
    and t.occurred_at >= p_from
    and t.occurred_at <= p_to;
$fn$;

comment on function public.monthly_summary is
  'Income/expense/net totals for a period. Transfers excluded -- they are not spending.';

-- ---------------------------------------------------------------------------
-- category_breakdown(from, to, kind) -- spend (or income) per category
--
-- Ordered largest first, which is the order the donut chart and the legend
-- both want. Uncategorised transactions collapse into a single null-id row.
-- ---------------------------------------------------------------------------
create or replace function public.category_breakdown(
  p_from timestamptz,
  p_to   timestamptz,
  p_kind public.category_kind default 'expense'
)
returns table (
  category_id       uuid,
  category_name     text,
  color             text,
  icon              text,
  total             numeric,
  transaction_count bigint,
  share             numeric
)
language sql
stable
security invoker
set search_path = ''
as $fn$
  with scoped as (
    select t.amount, t.category_id
    from public.transactions t
    where t.user_id = (select auth.uid())
      and t.occurred_at >= p_from
      and t.occurred_at <= p_to
      and t.type = (p_kind::text)::public.transaction_type
  ),
  grand as (
    select coalesce(sum(amount), 0) as total from scoped
  )
  select
    c.id as category_id,
    coalesce(c.name, 'Uncategorised') as category_name,
    coalesce(c.color, '#AEB6C4') as color,
    coalesce(c.icon, 'help-circle-outline') as icon,
    sum(s.amount)::numeric(14, 2) as total,
    count(*) as transaction_count,
    case
      when g.total = 0 then 0
      else round(sum(s.amount) * 100 / g.total, 2)
    end as share
  from scoped s
  cross join grand g
  left join public.categories c on c.id = s.category_id
  group by c.id, c.name, c.color, c.icon, g.total
  -- Ordered by the aggregate itself rather than the output alias `total`,
  -- which would be ambiguous against `grand.total`.
  order by sum(s.amount) desc;
$fn$;

comment on function public.category_breakdown is
  'Per-category totals and percentage share for a period. Drives the spend donut.';

-- A `daily_totals` function for trend sparklines is deliberately NOT defined
-- here. Bucketing by day requires the caller's timezone (grouping IST activity
-- by UTC days splits an evening's spending across two bars), and charts are
-- post-v1. It will be added with an explicit timezone parameter alongside the
-- reports screen rather than shipped now with a known off-by-one.

-- ---------------------------------------------------------------------------
-- Grants. RLS still applies on top of these; without them PostgREST cannot
-- even attempt the call.
-- ---------------------------------------------------------------------------
grant select on public.account_balances to authenticated;
grant select on public.net_worth        to authenticated;

revoke all on public.account_balances from anon;
revoke all on public.net_worth        from anon;

grant execute on function public.monthly_summary(timestamptz, timestamptz) to authenticated;
grant execute on function public.category_breakdown(timestamptz, timestamptz, public.category_kind) to authenticated;

revoke all on function public.monthly_summary(timestamptz, timestamptz) from anon;
revoke all on function public.category_breakdown(timestamptz, timestamptz, public.category_kind) from anon;
