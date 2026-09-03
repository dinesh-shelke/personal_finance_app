#!/usr/bin/env node
/**
 * Row Level Security isolation test.
 *
 * This is the check that proves the core requirement of the app: two family
 * members using the same Supabase project must never see each other's money.
 *
 * Unit tests cannot prove this — the guarantee lives in Postgres policies, not
 * in JavaScript. So this script drives the real API as two real users:
 *
 *   1. Creates throwaway users A and B (service role).
 *   2. As A, creates accounts, categories and transactions (including a transfer).
 *   3. As B, asserts every read of A's data returns zero rows.
 *   4. As B, asserts every write against A's data is rejected.
 *   5. Asserts the signup trigger seeded B correctly, and that A's own reads
 *      still work — an over-broad policy that denies everything would otherwise
 *      "pass" every isolation check.
 *   6. Deletes both users, cascading their rows away.
 *
 * Usage:
 *   npm run test:rls
 *
 * Requires in .env:
 *   EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Safe to run against the hosted project: it only ever touches the two users it
 * creates, and deletes them in a `finally` block.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON_KEY || !SERVICE_KEY) {
  console.error(
    'Missing config. Set EXPO_PUBLIC_SUPABASE_URL, ' +
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY in .env\n' +
      '(see .env.example).',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Tiny assertion harness. Collects failures instead of throwing on the first
// one, so a single run reports every hole rather than just the earliest.
// ---------------------------------------------------------------------------
let passed = 0;
const failures = [];

function check(description, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${description}`);
  } else {
    failures.push({ description, detail });
    console.log(`  ✗ ${description}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** A fresh anon-key client per user, so the two sessions never share storage. */
function userClient() {
  return createClient(URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

const stamp = process.hrtime.bigint().toString(36);
const password = `Test-${stamp}-Aa1!`;
const users = { a: null, b: null };

async function createUser(label) {
  const email = `rls-test-${label}-${stamp}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    // Mirrors the shape Google puts in raw_user_meta_data, so the signup
    // trigger's name/avatar extraction is exercised too.
    user_metadata: { full_name: `RLS Test ${label.toUpperCase()}`, avatar_url: null },
  });
  if (error) throw new Error(`Could not create user ${label}: ${error.message}`);

  const client = userClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`Could not sign in user ${label}: ${signInError.message}`);

  return { id: data.user.id, email, client };
}

async function main() {
  section('Creating two throwaway users');
  users.a = await createUser('a');
  users.b = await createUser('b');
  console.log(`  user A ${users.a.id}`);
  console.log(`  user B ${users.b.id}`);

  const A = users.a.client;
  const B = users.b.client;

  // -------------------------------------------------------------------------
  section('Signup trigger seeded each user');
  // -------------------------------------------------------------------------
  const { data: profileB } = await B.from('profiles').select('*').eq('id', users.b.id).single();
  check('profile row was created', profileB != null);
  check('currency defaults to INR', profileB?.currency === 'INR', `got ${profileB?.currency}`);
  check(
    'display name came from user metadata',
    profileB?.full_name === 'RLS Test B',
    `got ${profileB?.full_name}`,
  );

  const { data: seededAccounts } = await B.from('accounts').select('*');
  check(
    'a default Cash account exists',
    seededAccounts?.length === 1 && seededAccounts[0].name === 'Cash',
    `got ${JSON.stringify(seededAccounts?.map((a) => a.name))}`,
  );

  const { data: seededCategories } = await B.from('categories').select('id, kind');
  const incomeCount = seededCategories?.filter((c) => c.kind === 'income').length ?? 0;
  const expenseCount = seededCategories?.filter((c) => c.kind === 'expense').length ?? 0;
  check('income categories were seeded', incomeCount > 0, `got ${incomeCount}`);
  check('expense categories were seeded', expenseCount > 0, `got ${expenseCount}`);

  // -------------------------------------------------------------------------
  section('User A records some data');
  // -------------------------------------------------------------------------
  const { data: accountsA } = await A.from('accounts').select('id, name');
  const cashA = accountsA?.find((a) => a.name === 'Cash');
  check("A's seeded Cash account is readable by A", cashA != null);

  const { data: bankA, error: bankError } = await A.from('accounts')
    .insert({ user_id: users.a.id, name: 'HDFC Savings', type: 'bank', opening_balance: 1000 })
    .select()
    .single();
  check('A can create an account', bankError == null, bankError?.message);

  const { data: categoriesA } = await A.from('categories')
    .select('id, name, kind')
    .eq('kind', 'expense');
  const foodA = categoriesA?.[0];

  const { error: incomeError } = await A.from('transactions').insert({
    user_id: users.a.id,
    account_id: bankA.id,
    type: 'income',
    amount: 50000,
    occurred_at: new Date().toISOString(),
    note: 'Salary',
  });
  check('A can record income', incomeError == null, incomeError?.message);

  const { error: expenseError } = await A.from('transactions').insert({
    user_id: users.a.id,
    account_id: cashA.id,
    category_id: foodA.id,
    type: 'expense',
    amount: 1250.5,
    occurred_at: new Date().toISOString(),
  });
  check('A can record an expense', expenseError == null, expenseError?.message);

  const { error: transferError } = await A.from('transactions').insert({
    user_id: users.a.id,
    account_id: bankA.id,
    transfer_account_id: cashA.id,
    type: 'transfer',
    amount: 2000,
    occurred_at: new Date().toISOString(),
  });
  check('A can record a transfer', transferError == null, transferError?.message);

  // -------------------------------------------------------------------------
  section('Schema rejects malformed transactions');
  // -------------------------------------------------------------------------
  const { error: negativeError } = await A.from('transactions').insert({
    user_id: users.a.id,
    account_id: cashA.id,
    type: 'expense',
    amount: -100,
  });
  check('a negative amount is rejected', negativeError != null);

  const { error: selfTransferError } = await A.from('transactions').insert({
    user_id: users.a.id,
    account_id: cashA.id,
    transfer_account_id: cashA.id,
    type: 'transfer',
    amount: 100,
  });
  check('a transfer to the same account is rejected', selfTransferError != null);

  const { error: categorisedTransferError } = await A.from('transactions').insert({
    user_id: users.a.id,
    account_id: bankA.id,
    transfer_account_id: cashA.id,
    category_id: foodA.id,
    type: 'transfer',
    amount: 100,
  });
  check('a transfer carrying a category is rejected', categorisedTransferError != null);

  const { error: destinationOnExpenseError } = await A.from('transactions').insert({
    user_id: users.a.id,
    account_id: bankA.id,
    transfer_account_id: cashA.id,
    type: 'expense',
    amount: 100,
  });
  check('an expense naming a destination account is rejected', destinationOnExpenseError != null);

  // -------------------------------------------------------------------------
  section("A's own aggregates are correct");
  // -------------------------------------------------------------------------
  const { data: balancesA } = await A.from('account_balances').select('*');
  const bankBalance = balancesA?.find((b) => b.account_id === bankA.id);
  const cashBalance = balancesA?.find((b) => b.account_id === cashA.id);

  // 1000 opening + 50000 income - 2000 transferred out = 49000
  check(
    'bank balance accounts for income and an outgoing transfer',
    Number(bankBalance?.balance) === 49000,
    `got ${bankBalance?.balance}`,
  );
  // 0 opening + 2000 transferred in - 1250.50 expense = 749.50
  check(
    'cash balance accounts for an incoming transfer and an expense',
    Number(cashBalance?.balance) === 749.5,
    `got ${cashBalance?.balance}`,
  );

  const { data: netWorthA } = await A.from('net_worth').select('*').single();
  // Transfers cancel out, so net worth is opening 1000 + 50000 - 1250.50.
  check(
    'net worth ignores transfers',
    Number(netWorthA?.total_balance) === 49749.5,
    `got ${netWorthA?.total_balance}`,
  );

  const from = new Date(Date.now() - 86_400_000).toISOString();
  const to = new Date(Date.now() + 86_400_000).toISOString();

  const { data: summaryA } = await A.rpc('monthly_summary', { p_from: from, p_to: to });
  const rowA = Array.isArray(summaryA) ? summaryA[0] : summaryA;
  check('monthly income is exact', Number(rowA?.income) === 50000, `got ${rowA?.income}`);
  check('monthly expense is exact', Number(rowA?.expense) === 1250.5, `got ${rowA?.expense}`);
  check('monthly net is exact', Number(rowA?.net) === 48749.5, `got ${rowA?.net}`);
  check(
    'transfers are excluded from the transaction count',
    Number(rowA?.transaction_count) === 2,
    `got ${rowA?.transaction_count}`,
  );

  // =========================================================================
  section("ISOLATION — user B cannot READ user A's data");
  // =========================================================================
  const readChecks = [
    ['accounts', B.from('accounts').select('*').eq('user_id', users.a.id)],
    ['categories', B.from('categories').select('*').eq('user_id', users.a.id)],
    ['transactions', B.from('transactions').select('*').eq('user_id', users.a.id)],
    ['account_balances', B.from('account_balances').select('*').eq('user_id', users.a.id)],
    ['net_worth', B.from('net_worth').select('*').eq('user_id', users.a.id)],
    ['profiles', B.from('profiles').select('*').eq('id', users.a.id)],
  ];

  for (const [table, query] of readChecks) {
    const { data, error } = await query;
    check(
      `B sees zero rows of A's ${table}`,
      error == null && Array.isArray(data) && data.length === 0,
      error ? error.message : `got ${data?.length} rows`,
    );
  }

  // A direct fetch by primary key is the sharpest version of the same question:
  // even knowing the exact id must not reveal the row.
  const { data: byId } = await B.from('transactions').select('*').eq('account_id', bankA.id);
  check("B cannot fetch A's transactions by account id", byId?.length === 0, `got ${byId?.length}`);

  const { data: allB } = await B.from('transactions').select('*');
  check("B's own unfiltered transaction list is empty", allB?.length === 0, `got ${allB?.length}`);

  const { data: summaryB } = await B.rpc('monthly_summary', { p_from: from, p_to: to });
  const rowB = Array.isArray(summaryB) ? summaryB[0] : summaryB;
  check(
    "B's monthly summary does not include A's income",
    Number(rowB?.income ?? 0) === 0,
    `got ${rowB?.income}`,
  );

  // =========================================================================
  section("ISOLATION — user B cannot WRITE to user A's data");
  // =========================================================================

  // Insert a row owned by A. `with check` on the insert policy must reject it.
  const { error: forgedInsert } = await B.from('accounts').insert({
    user_id: users.a.id,
    name: 'Forged account',
    type: 'bank',
  });
  check('B cannot insert a row owned by A', forgedInsert != null, 'insert was ALLOWED');

  // Attach B's own transaction to A's account. The composite foreign key makes
  // this impossible even if the RLS policy were mis-written.
  const { error: forgedTransaction } = await B.from('transactions').insert({
    user_id: users.b.id,
    account_id: bankA.id,
    type: 'expense',
    amount: 999,
  });
  check(
    "B cannot attach a transaction to A's account",
    forgedTransaction != null,
    'insert was ALLOWED',
  );

  // Updates and deletes silently affect zero rows under RLS rather than
  // erroring, so assert on the row count and then re-read as A to be certain.
  const { data: updated } = await B.from('accounts')
    .update({ name: 'Hijacked' })
    .eq('id', bankA.id)
    .select();
  check("B's update of A's account affects no rows", (updated?.length ?? 0) === 0);

  const { data: deleted } = await B.from('transactions')
    .delete()
    .eq('user_id', users.a.id)
    .select();
  check("B's delete of A's transactions affects no rows", (deleted?.length ?? 0) === 0);

  const { data: profileUpdate } = await B.from('profiles')
    .update({ currency: 'USD' })
    .eq('id', users.a.id)
    .select();
  check("B's update of A's profile affects no rows", (profileUpdate?.length ?? 0) === 0);

  section("A's data survived B's attempts unchanged");
  const { data: accountAfter } = await A.from('accounts')
    .select('name')
    .eq('id', bankA.id)
    .single();
  check("A's account still has its own name", accountAfter?.name === 'HDFC Savings');

  const { data: txnsAfter } = await A.from('transactions').select('id');
  check(
    "A's three transactions are all still present",
    txnsAfter?.length === 3,
    `got ${txnsAfter?.length}`,
  );

  const { data: profileAfter } = await A.from('profiles')
    .select('currency')
    .eq('id', users.a.id)
    .single();
  check("A's currency was not changed", profileAfter?.currency === 'INR');

  // -------------------------------------------------------------------------
  section('Recurring schedules post the occurrences they owe');
  // -------------------------------------------------------------------------
  // Runs last on purpose: posting adds ledger rows, and the aggregate checks
  // above assert exact totals.
  //
  // A daily schedule keeps the arithmetic unambiguous. Starting three days ago
  // owes four occurrences — day -3, -2, -1 and today.
  const isoDate = (offsetDays) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  const { data: scheduleA, error: scheduleError } = await A.from('recurring_transactions')
    .insert({
      user_id: users.a.id,
      account_id: bankA.id,
      category_id: foodA.id,
      type: 'expense',
      amount: 100,
      frequency: 'daily',
      interval_count: 1,
      starts_on: isoDate(-3),
      note: 'Daily coffee',
    })
    .select()
    .single();
  check('A can create a schedule', scheduleError == null, scheduleError?.message);

  const { error: badShapeError } = await A.from('recurring_transactions').insert({
    user_id: users.a.id,
    account_id: bankA.id,
    category_id: foodA.id,
    transfer_account_id: cashA.id,
    type: 'transfer',
    amount: 100,
    frequency: 'monthly',
    starts_on: isoDate(0),
  });
  check('a transfer schedule carrying a category is rejected', badShapeError != null);

  const beforeCount = (await A.from('transactions').select('id')).data?.length ?? 0;

  const { data: postedFirst, error: postError } = await A.rpc('post_due_recurring');
  check('A can post due schedules', postError == null, postError?.message);
  check('four missed occurrences were written', postedFirst === 4, `got ${postedFirst}`);

  const afterCount = (await A.from('transactions').select('id')).data?.length ?? 0;
  check('the ledger grew by exactly four rows', afterCount === beforeCount + 4);

  const { data: postedAgain } = await A.rpc('post_due_recurring');
  check('a second call posts nothing', postedAgain === 0, `got ${postedAgain}`);

  await A.from('recurring_transactions')
    .update({ is_paused: true, starts_on: isoDate(-10) })
    .eq('id', scheduleA.id);
  const { data: postedPaused } = await A.rpc('post_due_recurring');
  check('a paused schedule posts nothing', postedPaused === 0, `got ${postedPaused}`);

  // -------------------------------------------------------------------------
  section('ISOLATION — schedules are private too');
  // -------------------------------------------------------------------------
  const { data: bSeesSchedules } = await B.from('recurring_transactions').select('*');
  check("B sees zero rows of A's schedules", bSeesSchedules?.length === 0);

  const { error: bStealSchedule } = await B.from('recurring_transactions').insert({
    user_id: users.a.id,
    account_id: bankA.id,
    type: 'expense',
    amount: 999,
    frequency: 'daily',
    starts_on: isoDate(0),
  });
  check('B cannot create a schedule owned by A', bStealSchedule != null);

  const { error: bUpdateSchedule, count: bUpdatedRows } = await B.from('recurring_transactions')
    .update({ amount: 1 }, { count: 'exact' })
    .eq('id', scheduleA.id);
  check(
    "B's update of A's schedule affects no rows",
    bUpdateSchedule != null || bUpdatedRows === 0,
    `updated ${bUpdatedRows}`,
  );

  // The posting function is `security invoker`, so B running it must walk only
  // B's own schedules. If this ever returns rows, the function is writing into
  // someone else's ledger.
  const { data: bPosted, error: bPostError } = await B.rpc('post_due_recurring');
  check('B can call the posting function', bPostError == null, bPostError?.message);
  check("B posting writes none of A's occurrences", bPosted === 0, `got ${bPosted}`);

  const { data: aLedgerAfterB } = await A.from('transactions').select('id');
  check(
    "A's ledger is untouched by B's posting run",
    aLedgerAfterB?.length === afterCount,
    `got ${aLedgerAfterB?.length}, expected ${afterCount}`,
  );
}

async function cleanup() {
  section('Cleaning up');
  for (const [label, user] of Object.entries(users)) {
    if (!user) continue;
    const { error } = await admin.auth.admin.deleteUser(user.id);
    // Deleting the auth user cascades through every table.
    console.log(
      error ? `  ! could not delete user ${label}: ${error.message}` : `  deleted user ${label}`,
    );
  }
}

try {
  await main();
} catch (error) {
  failures.push({ description: 'script threw', detail: error?.message ?? String(error) });
  console.error(`\nUnexpected error: ${error?.message ?? error}`);
} finally {
  await cleanup();
}

console.log(`\n${'='.repeat(60)}`);
if (failures.length === 0) {
  console.log(`RLS isolation: ALL ${passed} CHECKS PASSED`);
  process.exit(0);
} else {
  console.log(`RLS isolation: ${failures.length} FAILED, ${passed} passed\n`);
  for (const f of failures) {
    console.log(`  ✗ ${f.description}${f.detail ? `\n      ${f.detail}` : ''}`);
  }
  console.log('\nData is NOT properly isolated between users. Do not ship this.');
  process.exit(1);
}
