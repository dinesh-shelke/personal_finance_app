import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, Screen } from '@/components/ui';
import { AccountForm } from '@/features/accounts/AccountForm';
import {
  useAccountTransactionCount,
  useAllAccounts,
  useDeleteAccount,
  useSetAccountArchived,
  useUpdateAccount,
} from '@/features/accounts/hooks';
import type { AccountFormOutput, AccountFormValues } from '@/features/accounts/schema';
import { colors, hitSlop, radius, spacing, text } from '@/theme';

/** Edit one account, with archive and delete. */
export default function EditAccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: accounts, isLoading } = useAllAccounts();
  const account = accounts?.find((a) => a.id === id);

  const updateAccount = useUpdateAccount();
  const setArchived = useSetAccountArchived();
  const deleteAccount = useDeleteAccount();
  const { data: transactionCount = 0 } = useAccountTransactionCount(id);

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: AccountFormOutput) => {
    setError(null);
    try {
      await updateAccount.mutateAsync({ id: id as string, input: values });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your changes.');
    }
  };

  const confirmArchive = () => {
    Alert.alert(
      'Archive this account?',
      'It disappears from the dashboard and pickers, but its transactions stay in your history and reports. You can restore it later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            await setArchived.mutateAsync({ id: id as string, archived: true });
            router.back();
          },
        },
      ],
    );
  };

  /**
   * Deleting cascades to every transaction on the account, so the count is
   * stated plainly. Archiving is offered as the non-destructive alternative in
   * the same dialog rather than buried elsewhere.
   */
  const confirmDelete = () => {
    Alert.alert(
      'Delete permanently?',
      transactionCount > 0
        ? `This also deletes ${transactionCount} transaction${
            transactionCount === 1 ? '' : 's'
          } on this account. Balances and past reports will change. This cannot be undone.\n\nArchiving keeps your history instead.`
        : 'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive instead', onPress: confirmArchive },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount.mutateAsync(id as string);
              router.back();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not delete the account.');
            }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={text.h2}>Edit account</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !account ? (
        <EmptyState
          icon="help-circle-outline"
          title="Account not found"
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      ) : (
        <AccountForm
          initialValues={toFormValues(account)}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          submitLabel="Save changes"
          isSubmitting={updateAccount.isPending}
          submitError={error}
          footer={
            <View style={styles.dangerZone}>
              <Text style={text.label}>
                {transactionCount} transaction{transactionCount === 1 ? '' : 's'} on this account
              </Text>

              {account.is_archived ? (
                <Pressable
                  onPress={() => setArchived.mutate({ id: account.id, archived: false })}
                  style={styles.dangerRow}
                  accessibilityRole="button"
                >
                  <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                  <Text style={[text.body, styles.restore]}>Restore account</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={confirmArchive}
                  style={styles.dangerRow}
                  accessibilityRole="button"
                >
                  <Ionicons name="archive-outline" size={18} color={colors.textSecondary} />
                  <Text style={text.body}>Archive account</Text>
                </Pressable>
              )}

              <Pressable
                onPress={confirmDelete}
                style={styles.dangerRow}
                accessibilityRole="button"
              >
                <Ionicons name="trash-outline" size={18} color={colors.negative} />
                <Text style={[text.body, styles.delete]}>Delete permanently</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </Screen>
  );
}

function toFormValues(account: {
  name: string;
  type: 'cash' | 'bank' | 'credit_card' | 'wallet' | 'investment';
  opening_balance: number;
  color: string;
  icon: string;
}): AccountFormValues {
  return {
    name: account.name,
    type: account.type,
    // Empty rather than "0" so the placeholder shows instead of a stray zero.
    openingBalance: Number(account.opening_balance) === 0 ? '' : String(account.opening_balance),
    color: account.color,
    icon: account.icon,
  };
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerZone: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.xxs,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.input,
  },
  restore: {
    color: colors.primary,
  },
  delete: {
    color: colors.negative,
  },
});
