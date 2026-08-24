import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AmountText, Card, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { colors, radius, spacing, text } from '@/theme';

import { TAB_BAR_HEIGHT } from './_layout';

/**
 * Dashboard.
 *
 * M6 replaces the placeholder blocks below with the real balance, month summary
 * and account carousel. The shell, greeting and layout rhythm are final.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useSession();

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ??
    user?.email?.split('@')[0] ??
    'there';

  return (
    <Screen scroll bottomInset={TAB_BAR_HEIGHT}>
      <View style={styles.header}>
        <View style={styles.greeting}>
          <Text style={text.caption}>Welcome back</Text>
          <Text style={text.h1} numberOfLines={1}>
            {capitalise(displayName)}
          </Text>
        </View>
        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color={colors.primary} />
        </View>
      </View>

      <Card style={styles.balanceCard}>
        <Text style={text.label}>Total balance</Text>
        <AmountText amount={0} size="display" />
        <View style={styles.pillRow}>
          <SummaryPill label="Income" amount={0} tone="positive" icon="arrow-down" />
          <SummaryPill label="Expense" amount={0} tone="negative" icon="arrow-up" />
        </View>
      </Card>

      <SectionHeader title="My accounts" actionLabel="Manage" onAction={() => router.push('/')} />
      <Card variant="flat" padding="none">
        <EmptyState
          compact
          icon="wallet-outline"
          title="Accounts land here"
          message="Balances per wallet arrive with milestone M4."
        />
      </Card>

      <SectionHeader title="Recent history" />
      <Card variant="flat" padding="none">
        <EmptyState
          compact
          icon="receipt-outline"
          title="No transactions yet"
          message="Tap the + button to record your first income or expense."
          actionLabel="Add transaction"
          onAction={() => router.push('/transaction/new')}
        />
      </Card>
    </Screen>
  );
}

function SummaryPill({
  label,
  amount,
  tone,
  icon,
}: {
  label: string;
  amount: number;
  tone: 'positive' | 'negative';
  icon: keyof typeof Ionicons.glyphMap;
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
        <AmountText amount={amount} size="caption" hideDecimals />
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
});
