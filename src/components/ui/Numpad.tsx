import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, text } from '@/theme';
import { applyNumpadKey } from '@/utils/numpad';

type NumpadProps = {
  /** Current raw text, e.g. "1250.5". The parent owns the state. */
  value: string;
  onChange: (next: string) => void;
  /** Digits allowed after the decimal point. */
  maxDecimals?: number;
  /** Digits allowed before it — guards against overflowing numeric(14,2). */
  maxIntegerDigits?: number;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'] as const;

/**
 * The custom keypad from the reference's amount-entry screen.
 *
 * A real keypad rather than a TextInput with `keyboardType="numeric"`: Android's
 * numeric keyboard still offers a comma, a minus and (on some OEM keyboards) a
 * second decimal separator, all of which produce amounts the schema rejects.
 * Constraining the input to what is valid means the Save button never has to
 * explain a malformed number.
 */
export function Numpad({ value, onChange, maxDecimals = 2, maxIntegerDigits = 12 }: NumpadProps) {
  // Input rules live in `applyNumpadKey` so they can be unit-tested; see
  // src/utils/__tests__/numpad.test.ts.
  const press = (key: (typeof KEYS)[number]) => {
    const next = applyNumpadKey(value, key, { maxDecimals, maxIntegerDigits });
    if (next !== value) onChange(next);
  };

  return (
    <View style={styles.grid}>
      {KEYS.map((key) => (
        <Pressable
          key={key}
          onPress={() => press(key)}
          accessibilityRole="button"
          accessibilityLabel={key === 'backspace' ? 'Delete last digit' : key}
          style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
        >
          {key === 'backspace' ? (
            <Ionicons name="backspace-outline" size={24} color={colors.textPrimary} />
          ) : (
            <Text style={text.h1}>{key}</Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

/** Quick-amount chips, as in the reference's "$10 / $50 / $100" row. */
export function QuickAmounts({
  amounts,
  onPick,
  formatAmount,
}: {
  amounts: number[];
  onPick: (amount: string) => void;
  formatAmount: (amount: number) => string;
}) {
  return (
    <View style={styles.chipRow}>
      {amounts.map((amount) => (
        <Pressable
          key={amount}
          onPress={() => onPick(String(amount))}
          accessibilityRole="button"
          style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
        >
          <Text style={text.caption}>{formatAmount(amount)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  key: {
    // Exactly a third of the row, so three columns land flush with the edges.
    width: '33.333%',
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.input,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipPressed: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
});
