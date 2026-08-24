import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MonthSelector } from '@/components/MonthSelector';
import { TransactionRow } from '@/components/TransactionRow';
import { AmountText, Card, EmptyState, Segmented, TextField } from '@/components/ui';
import { useMoneyFormat } from '@/features/profile/hooks';
import { useTransactionSections } from '@/features/transactions/hooks';
import { colors, radius, spacing, text } from '@/theme';
import type { TransactionType } from '@/types/database';
import { monthRange } from '@/utils/date';

import { TAB_BAR_HEIGHT } from './_layout';

type TypeFilter = 'all' | TransactionType;

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

/**
 * Transaction history, grouped by day within a month.
 *
 * A `SectionList` rather than a ScrollView: history grows without bound, and
 * only the visible rows should ever be mounted.
 */
export default function TransactionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { format } = useMoneyFormat();

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const filters = useMemo(() => {
    const { from, to } = monthRange(month);
    return {
      from,
      to,
      type: typeFilter === 'all' ? undefined : typeFilter,
      search: search.trim() || undefined,
    };
  }, [month, typeFilter, search]);

  const {
    sections,
    isEmpty,
    isLoading,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error,
  } = useTransactionSections(filters);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={text.h1}>History</Text>
          <Pressable
            onPress={() => {
              // Clear the query when closing, so a hidden filter never silently
              // keeps the list narrowed.
              if (showSearch) setSearch('');
              setShowSearch((v) => !v);
            }}
            accessibilityRole="button"
            accessibilityLabel={showSearch ? 'Close search' : 'Search notes'}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons name={showSearch ? 'close' : 'search'} size={18} color={colors.textPrimary} />
          </Pressable>
        </View>

        {showSearch ? (
          <TextField
            value={search}
            onChangeText={setSearch}
            placeholder="Search notes…"
            autoFocus
            returnKeyType="search"
          />
        ) : null}

        <MonthSelector month={month} onChange={setMonth} />

        <Segmented options={TYPE_FILTERS} value={typeFilter} onChange={setTypeFilter} />
      </View>

      {isLoading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load your history"
          message={error instanceof Error ? error.message : 'Check your connection and try again.'}
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      ) : isEmpty ? (
        <EmptyState
          icon="receipt-outline"
          title={search.trim() ? 'Nothing matched' : 'No transactions this month'}
          message={
            search.trim()
              ? 'Try a different search term.'
              : 'Tap the + button to record income or an expense.'
          }
          actionLabel={search.trim() ? undefined : 'Add transaction'}
          onAction={search.trim() ? undefined : () => router.push('/transaction/new')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listBody,
            { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + spacing.xxl },
          ]}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isFetchingNextPage}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          // Load the next page slightly before the user hits the bottom.
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={text.h3}>{section.title}</Text>
              <View style={styles.sectionTotals}>
                {section.income > 0 ? (
                  <AmountText
                    amount={section.income}
                    size="caption"
                    txnType="income"
                    showSign
                    hideDecimals
                  />
                ) : null}
                {section.expense > 0 ? (
                  <Text style={[text.caption, styles.expenseTotal]}>
                    {format(-section.expense, { hideDecimals: true, showSign: true })}
                  </Text>
                ) : null}
              </View>
            </View>
          )}
          renderItem={({ item }) => (
            <Card variant="flat" padding="sm" style={styles.rowCard}>
              <TransactionRow
                transaction={item}
                onPress={() => router.push(`/transaction/${item.id}`)}
              />
            </Card>
          )}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  listBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionTotals: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  expenseTotal: {
    color: colors.negative,
  },
  rowCard: {
    marginBottom: spacing.xs,
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: spacing.lg,
  },
});
