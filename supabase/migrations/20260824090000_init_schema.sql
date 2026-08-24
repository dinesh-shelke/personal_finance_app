-- ============================================================================
-- Core schema: profiles, accounts, categories, transactions.
--
-- Design notes the rest of the app depends on:
--
--  * Money is `numeric(14,2)` -- exact in Postgres. Every total the app shows is
--    aggregated here in SQL, never by adding floats in JavaScript.
--
--  * A transfer is ONE row (type = 'transfer'), with `account_id` as the source
--    and `transfer_account_id` as the destination. Two-row transfers double the
--    bookkeeping and drift apart on partial edits.
--
--  * Cross-user references are impossible *structurally*, not merely by policy:
--    child tables carry `user_id` and point at composite keys `(id, user_id)`.
--    A client cannot attach its transaction to another family member's account
--    even if an RLS policy were later mis-written.
-- ============================================================================

create extension if not exists "pgcrypto" with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.account_type as enum ('cash', 'bank', 'credit_card', 'wallet', 'investment');
create type public.category_kind as enum ('income', 'expense');
create type public.transaction_type as enum ('income', 'expense', 'transfer');

-- ---------------------------------------------------------------------------
-- Shared trigger: keep `updated_at` honest
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

comment on function public.set_updated_at is
  'Stamps updated_at on every UPDATE. Attached to profiles, accounts, categories, transactions.';

-- ---------------------------------------------------------------------------
-- profiles -- one row per auth user, created by the signup trigger
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text,
  avatar_url    text,
  currency      text        not null default 'INR',
  locale        text        not null default 'en-IN',
  hide_balances boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint profiles_currency_is_iso4217 check (currency ~ '^[A-Z]{3}$'),
  constraint profiles_full_name_length check (full_name is null or length(full_name) <= 120)
);

comment on table public.profiles is
  'Per-user settings. `currency` drives all money formatting in the client.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- accounts -- the wallets money sits in
-- ---------------------------------------------------------------------------
create table public.accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null,
  type            public.account_type not null default 'bank',
  opening_balance numeric(14, 2) not null default 0,
  color           text not null default '#0B3B4C',
  icon            text not null default 'wallet-outline',
  is_archived     boolean not null default false,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint accounts_name_not_blank check (btrim(name) <> ''),
  constraint accounts_name_length check (length(name) <= 60),
  constraint accounts_color_is_hex check (color ~ '^#[0-9A-Fa-f]{6}$'),
  -- Stops a second "Cash" appearing and silently splitting the balance in two.
  -- Renaming before archiving is the escape hatch.
  constraint accounts_name_unique_per_user unique (user_id, name),
  -- Target for the composite foreign keys declared on transactions.
  constraint accounts_id_user_unique unique (id, user_id)
);

comment on table public.accounts is
  'Cash/bank/card buckets. Live balance comes from the account_balances view, never a stored column.';
comment on column public.accounts.opening_balance is
  'Balance before the first recorded transaction. May be negative for a credit card.';

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

create index accounts_user_active_idx
  on public.accounts (user_id, sort_order)
  where not is_archived;

-- ---------------------------------------------------------------------------
-- categories -- what the money was for
-- ---------------------------------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  kind       public.category_kind not null,
  icon       text not null default 'pricetag-outline',
  color      text not null default '#6B7A99',
  parent_id  uuid,
  is_system  boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint categories_name_not_blank check (btrim(name) <> ''),
  constraint categories_name_length check (length(name) <= 60),
  constraint categories_color_is_hex check (color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint categories_not_own_parent check (parent_id is distinct from id),
  constraint categories_name_unique_per_user unique (user_id, kind, name),
  constraint categories_id_user_unique unique (id, user_id),

  -- Composite FK: a sub-category can only nest under one of your own categories.
  constraint categories_parent_same_user
    foreign key (parent_id, user_id) references public.categories (id, user_id)
    on delete set null (parent_id)
);

comment on table public.categories is
  'Income and expense categories. Seeded per user on signup; is_system marks the seeded set.';

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create index categories_user_kind_idx on public.categories (user_id, kind, sort_order);

-- ---------------------------------------------------------------------------
-- transactions -- the ledger
-- ---------------------------------------------------------------------------
create table public.transactions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  account_id          uuid not null,
  category_id         uuid,
  transfer_account_id uuid,
  type                public.transaction_type not null,
  amount              numeric(14, 2) not null,
  occurred_at         timestamptz not null default now(),
  note                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Direction lives in `type`, so the magnitude is always positive. This keeps
  -- every SUM in the views below unambiguous.
  constraint transactions_amount_positive check (amount > 0),
  constraint transactions_amount_sane check (amount <= 999999999999.99),
  constraint transactions_note_length check (note is null or length(note) <= 500),

  -- A transfer names a different destination account and carries no category;
  -- income and expense name no destination.
  constraint transactions_shape check (
    case type
      when 'transfer' then
        transfer_account_id is not null
        and transfer_account_id <> account_id
        and category_id is null
      else
        transfer_account_id is null
    end
  ),

  constraint transactions_account_same_user
    foreign key (account_id, user_id) references public.accounts (id, user_id)
    on delete cascade,

  constraint transactions_transfer_account_same_user
    foreign key (transfer_account_id, user_id) references public.accounts (id, user_id)
    on delete cascade,

  -- Deleting a category leaves its transactions in place as "Uncategorised"
  -- rather than destroying financial history.
  constraint transactions_category_same_user
    foreign key (category_id, user_id) references public.categories (id, user_id)
    on delete set null (category_id)
);

comment on table public.transactions is
  'One row per money movement. Transfers are a single row with a destination account.';
comment on column public.transactions.amount is
  'Always positive; direction is carried by `type`.';
comment on column public.transactions.category_id is
  'Nullable -- a deleted category leaves its transactions Uncategorised.';

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- Drives the history list, which is always "mine, newest first".
create index transactions_user_occurred_idx
  on public.transactions (user_id, occurred_at desc, id desc);

-- Drives per-account / per-category filtering and the breakdown report.
create index transactions_user_account_idx
  on public.transactions (user_id, account_id, occurred_at desc);
create index transactions_user_category_idx
  on public.transactions (user_id, category_id, occurred_at desc);
create index transactions_transfer_account_idx
  on public.transactions (user_id, transfer_account_id, occurred_at desc)
  where transfer_account_id is not null;
