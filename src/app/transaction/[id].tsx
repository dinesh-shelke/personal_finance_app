import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, Screen } from '@/components/ui';
import { TransactionForm } from '@/features/transactions/TransactionForm';
import {
  useDeleteTransaction,
  useTransaction,
  useUpdateTransaction,
} from '@/features/transactions/hooks';
import type { TransactionFormOutput, TransactionFormValues } from '@/features/transactions/schema';
import { colors, hitSlop, spacing, text } from '@/theme';

/** Edit or delete an existing transaction. */
export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: transaction, isLoading } = useTransaction(id);
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: TransactionFormOutput) => {
    setError(null);
    try {
      await updateTransaction.mutateAsync({
        id: id as string,
        input: {
          type: values.type,
          amount: values.amount,
          accountId: values.accountId,
          categoryId: values.categoryId ?? null,
          transferAccountId: values.transferAccountId ?? null,
          occurredAt: values.occurredAt,
          note: values.note,
        },
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your changes.');
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete transaction?',
      'This removes it from your history and adjusts the account balance. It cannot be undone.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction.mutateAsync(id as string);
              router.back();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not delete the transaction.');
            }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={text.h2}>Edit transaction</Text>
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
      ) : !transaction ? (
        <EmptyState
          icon="help-circle-outline"
          title="Transaction not found"
          message="It may have been deleted on another device."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      ) : (
        <TransactionForm
          initialValues={toFormValues(transaction)}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          submitLabel="Save changes"
          isSubmitting={updateTransaction.isPending}
          submitError={error}
          onDelete={confirmDelete}
        />
      )}
    </Screen>
  );
}

/**
 * Database row -> form state.
 *
 * `amount` becomes a string because the numpad edits raw text. `toFixed(2)`
 * would append a needless ".00" to whole amounts, so trailing zeros are
 * trimmed — the user sees "500", not "500.00", when they open the form.
 */
function toFormValues(transaction: {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  account_id: string;
  category_id: string | null;
  transfer_account_id: string | null;
  occurred_at: string;
  note: string | null;
}): TransactionFormValues {
  return {
    type: transaction.type,
    amount: String(Number(transaction.amount)),
    accountId: transaction.account_id,
    categoryId: transaction.category_id,
    transferAccountId: transaction.transfer_account_id,
    occurredAt: transaction.occurred_at,
    note: transaction.note,
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
});
