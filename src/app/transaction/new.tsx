import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, Screen } from '@/components/ui';
import { colors, hitSlop, spacing, text } from '@/theme';

/**
 * New-transaction sheet. Presented as a modal from the centre tab button.
 *
 * M5 fills this in with the segmented Income/Expense/Transfer control, the
 * custom numpad, and the account and category pickers.
 */
export default function NewTransactionScreen() {
  const router = useRouter();

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

      <EmptyState
        icon="calculator-outline"
        title="Amount entry lands here"
        message="The numpad, account picker and category grid arrive with milestone M5."
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
    paddingBottom: spacing.lg,
  },
});
