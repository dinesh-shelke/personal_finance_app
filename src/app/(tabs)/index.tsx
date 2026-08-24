import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AccountCard } from '@/components/AccountCard';
import { TransactionRow } from '@/components/TransactionRow';
import { AmountText, Card, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { useAccountBalances, useNetWorth } from '@/features/accounts/hooks';
import { useSession } from '@/features/auth/SessionProvider';
import { useMoneyFormat, useProfile, useUpdateProfile } from '@/features/profile/hooks';
import { useMonthlySummary, useTransactions } from '@/features/transactions/hooks';
import { colors, radius, spacing, text } from '@/theme';
import { monthRange } from '@/utils/date';

import { TAB_BAR_HEIGHT } from './_layout';

/**
 * Dashboard — the screen the app opens on.
 *
 * Answers three questions in order: how much do I have, what has moved this
 * month, and what did I just spend. Everything below that is navigation.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useSession();

  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { format } = useMoneyFormat();

  const { from, to } = useMemo(() => monthRange(new Date()), []);

  const netWorth = useNetWorth();
  const accounts = useAccountBalances();
  const summary = useMonthlySummary(from, to);
  const recent = useTransactions({ from, to });

  // Session-local override of the saved preference: the eye toggle should hide
  // balances now without writing to the database on every tap.
  const [hiddenOverride, setHiddenOverride] = useState<boolean | null>(null);
  const balancesHidden = hiddenOverride ?? profile?.hide_balances ?? false;

  const recentItems = recent.data?.pages.flatMap((page) => page.items).slice(0, 5) ?? [];

  const firstName =
    profile?.full_name?.trim().split(' ')[0] ??
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ??
    user?.email?.split('@')[0] ??
    'there';

  const refreshing =
    netWorth.isFetching || accounts.isFetching || summary.isFetching || recent.isFetching;

  const refetchAll = () => {
    void netWorth.refetch();
    void accounts.refetch();
    void summary.refetch();
    void recent.refetch();
  };

  return (
    <Screen scroll bottomInset={TAB_BAR_HEIGHT} onRefresh={refetchAll} refreshing={refreshing}>
      <View style={styles.header}>
        <View style={styles.greeting}>
          <Text style={text.caption}>Welcome back</Text>
          <Text style={text.h1} numberOfLines={1}>
            {capitalise(firstName)}
          </Text>
        </View>
        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color={colors.primary} />
        </View>
      </View>

      {/* Total balance */}
      <Card style={styles.balanceCard}>
        <Text style={text.label}>Total balance</Text>

        {netWorth.isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.inlineLoader} />
        ) : (
          <AmountText
            amount={netWorth.data?.total_balance ?? 0}
            size="display"
            hidden={balancesHidden}
            onToggleHidden={() => {
              const next = !balancesHidden;
              setHiddenOverride(next);
              // Persist so the choice survives a restart.
              updateProfile.mutate({ hide_balances: next });
            }}
          />
        )}

        <View style={styles.pillRow}>
          <SummaryPill
            label="Income"
            amount={summary.data?.income ?? 0}
            tone="positive"
            icon="arrow-down"
            hidden={balancesHidden}
            loading={summary.isLoading}
          />
          <SummaryPill
            label="Expense"
            amount={summary.data?.expense ?? 0}
            tone="negative"
            icon="arrow-up"
            hidden={balancesHidden}
            loading={summary.isLoading}
          />
        </View>

        {summary.data && !balancesHidden ? (
          <Text style={[text.tiny, styles.netLine]}>
            {summary.data.net >= 0 ? 'Saved ' : 'Overspent '}
            {format(Math.abs(summary.data.net))} this month
          </Text>
        ) : null}
      </Card>

      {/* Accounts */}
      <SectionHeader
        title="My accounts"
        actionLabel="Manage"
        onAction={() => router.push('/accounts')}
      />

      {accounts.isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.inlineLoader} />
      ) : (accounts.data?.length ?? 0) === 0 ? (
        <Card variant="flat" padding="none">
          <EmptyState
            compact
            icon="wallet-outline"
            title="No accounts yet"
            message="Add a wallet or bank account to start tracking."
            actionLabel="Add account"
            onAction={() => router.push('/accounts/new')}
          />
        </Card>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          // Negative margin lets the cards bleed to the screen edge while the
          // rest of the page keeps its gutter.
          style={styles.carouselOuter}
        >
          {accounts.data?.map((account, index) => (
            <AccountCard
              key={account.account_id}
              account={account}
              highlighted={index === 0}
              hideAmount={balancesHidden}
              onPress={() => router.push(`/accounts/${account.account_id}`)}
            />
          ))}
        </ScrollView>
      )}

      {/* Recent history */}
      <SectionHeader
        title="Recent history"
        actionLabel={recentItems.length > 0 ? 'View all' : undefined}
        onAction={recentItems.length > 0 ? () => router.push('/transactions') : undefined}
      />

      {recent.isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.inlineLoader} />
      ) : recentItems.length === 0 ? (
        <Card variant="flat" padding="none">
          <EmptyState
            compact
            icon="receipt-outline"
            title="Nothing recorded yet"
            message="Tap the + button to add your first income or expense."
            actionLabel="Add transaction"
            onAction={() => router.push('/transaction/new')}
          />
        </Card>
      ) : (
        <Card padding="sm">
          {recentItems.map((item, index) => (
            <View key={item.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <TransactionRow
                transaction={item}
                onPress={() => router.push(`/transaction/${item.id}`)}
              />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function SummaryPill({
  label,
  amount,
  tone,
  icon,
  hidden,
  loading,
}: {
  label: string;
  amount: number;
  tone: 'positive' | 'negative';
  icon: keyof typeof Ionicons.glyphMap;
  hidden: boolean;
  loading: boolean;
}) {
  const color = tone === 'positive' ? colors.positive : colors.negative;
  const bg = tone === 'positive' ? colors.positiveBg : colors.negativeBg;

  return (
    <View style={styles.pill}>
      <View style={[styles.pillIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <View style={styles.pillCopy}>
        <Text style={text.tiny}>{label}</Text>
        {loading ? (
          <Text style={text.caption}>—</Text>
        ) : (
          <AmountText amount={amount} size="caption" hideDecimals hidden={hidden} />
        )}
      </View>
    </View>
  );
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  greeting: {
    flex: 1,
    gap: 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    gap: spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.input,
    padding: spacing.sm,
  },
  pillIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillCopy: {
    flex: 1,
    gap: 1,
  },
  netLine: {
    marginTop: spacing.xs,
  },
  carouselOuter: {
    marginHorizontal: -spacing.lg,
  },
  carousel: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 50,
  },
  inlineLoader: {
    paddingVertical: spacing.lg,
  },
});
