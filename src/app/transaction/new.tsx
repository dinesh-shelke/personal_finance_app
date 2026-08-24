import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui';
import { useAccountBalances } from '@/features/accounts/hooks';
import { TransactionForm } from '@/features/transactions/TransactionForm';
import { useCreateTransaction } from '@/features/transactions/hooks';
import { emptyTransactionForm, type TransactionFormOutput } from '@/features/transactions/schema';
import { colors, hitSlop, spacing, text } from '@/theme';

/** New transaction. Presented as a modal from the centre tab button. */
export default function NewTransactionScreen() {
  const router = useRouter();
  const createTransaction = useCreateTransaction();
  const { data: accounts } = useAccountBalances();
  const [error, setError] = useState<string | null>(null);

  // Preselect the first account so the common case is amount → category → save
  // with no picker interaction at all.
  const defaultAccountId = accounts?.[0]?.account_id ?? '';

  const handleSubmit = async (values: TransactionFormOutput) => {
    setError(null);
    try {
      await createTransaction.mutateAsync({
        type: values.type,
        amount: values.amount,
        accountId: values.accountId,
        categoryId: values.categoryId ?? null,
        transferAccountId: values.transferAccountId ?? null,
        occurredAt: values.occurredAt,
        note: values.note,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the transaction.');
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={text.h2}>New transaction</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
      </View>

      <TransactionForm
        // Remount once accounts arrive so the preselected account takes effect.
        key={defaultAccountId}
        initialValues={emptyTransactionForm(defaultAccountId)}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        submitLabel="Save"
        isSubmitting={createTransaction.isPending}
        submitError={error}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
});
