import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, text } from '@/theme';

type Option<T extends string> = { value: T; label: string };

type SegmentedProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Per-option tint for the selected state, e.g. green for Income. */
  tints?: Partial<Record<T, string>>;
};

/**
 * Pill-shaped segmented control, used for Income / Expense / Transfer.
 *
 * Implemented with `radio` accessibility roles rather than buttons so a screen
 * reader announces "2 of 3 selected" instead of three unrelated buttons.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  tints,
}: SegmentedProps<T>) {
  return (
    <View style={styles.track} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option.value === value;
        const tint = tints?.[option.value] ?? colors.primary;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={[styles.segment, selected && { backgroundColor: tint }]}
          >
            <Text
              style={[text.body, styles.label, selected && styles.labelSelected]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: spacing.xxs,
    gap: spacing.xxs,
  },
  segment: {
    flex: 1,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.onPrimary,
  },
});
