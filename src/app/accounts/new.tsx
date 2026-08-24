import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui';
import { AccountForm } from '@/features/accounts/AccountForm';
import { useCreateAccount } from '@/features/accounts/hooks';
import type { AccountFormOutput } from '@/features/accounts/schema';
import { colors, hitSlop, spacing, text } from '@/theme';

export default function NewAccountScreen() {
  const router = useRouter();
  const createAccount = useCreateAccount();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: AccountFormOutput) => {
    setError(null);
    try {
      await createAccount.mutateAsync(values);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the account.');
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={text.h2}>New account</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
      </View>

      <AccountForm
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        submitLabel="Create account"
        isSubmitting={createAccount.isPending}
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
