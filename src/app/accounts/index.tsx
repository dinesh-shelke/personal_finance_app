import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AmountText, Card, EmptyState, ListRow, PillButton, Screen } from '@/components/ui';
import { useAllAccounts, useSetAccountArchived } from '@/features/accounts/hooks';
import { accountTypeLabel } from '@/features/accounts/schema';
import { colors, hitSlop, spacing, text } from '@/theme';

/** Manage accounts: add, edit, archive, restore. */
export default function AccountsScreen() {
  const router = useRouter();
  const { data: accounts = [], isLoading, error, refetch } = useAllAccounts();
  const setArchived = useSetAccountArchived();

  const active = accounts.filter((a) => !a.is_archived);
  const archived = accounts.filter((a) => a.is_archived);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={text.h2}>Accounts</Text>
        <View style={styles.spacer} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load accounts"
          message={error instanceof Error ? error.message : undefined}
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      ) : (
        <>
          {active.length === 0 ? (
            <Card variant="flat" padding="none">
              <EmptyState
                compact
                icon="wallet-outline"
                title="No active accounts"
                message="Add a wallet, bank account or card to start tracking."
              />
            </Card>
          ) : (
            <Card padding="sm">
              {active.map((account, index) => (
                <View key={account.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <ListRow
                    icon={account.icon as keyof typeof Ionicons.glyphMap}
                    iconColor={account.color}
                    title={account.name}
                    subtitle={accountTypeLabel(account.type)}
                    onPress={() => router.push(`/accounts/${account.id}`)}
                    trailing={
                      <AmountText amount={account.opening_balance} size="caption" hideDecimals />
                    }
                    showChevron
                  />
                </View>
              ))}
            </Card>
          )}

          <View style={styles.addButton}>
            <PillButton
              label="Add account"
              icon="add"
              onPress={() => router.push('/accounts/new')}
            />
          </View>

          {archived.length > 0 ? (
            <>
              <Text style={[text.label, styles.archivedLabel]}>
                Archived — hidden from the dashboard, history kept
              </Text>
              <Card padding="sm">
                {archived.map((account, index) => (
                  <View key={account.id}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <ListRow
                      icon={account.icon as keyof typeof Ionicons.glyphMap}
                      iconColor={colors.textMuted}
                      title={account.name}
                      subtitle={accountTypeLabel(account.type)}
                      trailing={
                        <Pressable
                          onPress={() => setArchived.mutate({ id: account.id, archived: false })}
                          hitSlop={hitSlop}
                          accessibilityRole="button"
                          accessibilityLabel={`Restore ${account.name}`}
                        >
                          <Text style={[text.caption, styles.restore]}>Restore</Text>
                        </Pressable>
                      }
                    />
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  spacer: {
    width: 24,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 50,
  },
  addButton: {
    marginTop: spacing.lg,
  },
  archivedLabel: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xs,
  },
  restore: {
    color: colors.primary,
  },
  loader: {
    paddingVertical: spacing.xxl,
  },
});
