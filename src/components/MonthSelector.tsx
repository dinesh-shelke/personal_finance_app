import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, hitSlop, radius, spacing, text } from '@/theme';
import { formatMonthTitle } from '@/utils/date';

type MonthSelectorProps = {
  /** First day of the displayed month. */
  month: Date;
  onChange: (month: Date) => void;
};

/**
 * Previous / next month stepper.
 *
 * Stepping forward past the current month is blocked: there is nothing to see
 * there, and a user who lands on an empty future month reasonably concludes
 * their data is missing.
 */
export function MonthSelector({ month, onChange }: MonthSelectorProps) {
  const now = new Date();
  const isCurrentMonth =
    month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();

  const step = (delta: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    onChange(next);
  };

  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => step(-1)}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
      </Pressable>

      <Pressable
        // Tapping the title jumps back to today — the fastest way out of a
        // deep scroll through last year.
        onPress={() => onChange(new Date(now.getFullYear(), now.getMonth(), 1))}
        disabled={isCurrentMonth}
        accessibilityRole="button"
        accessibilityLabel={`${formatMonthTitle(month)}${isCurrentMonth ? '' : ', tap for this month'}`}
        style={styles.title}
      >
        <Text style={text.h2}>{formatMonthTitle(month)}</Text>
        {isCurrentMonth ? null : <Text style={text.tiny}>Tap for this month</Text>}
      </Pressable>

      <Pressable
        onPress={() => step(1)}
        disabled={isCurrentMonth}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Next month"
        accessibilityState={{ disabled: isCurrentMonth }}
        style={({ pressed }) => [
          styles.arrow,
          pressed && styles.pressed,
          isCurrentMonth && styles.disabled,
        ]}
      >
        <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  arrow: {
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
  disabled: {
    opacity: 0.35,
  },
  title: {
    flex: 1,
    alignItems: 'center',
  },
});
