import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme';

type CardProps = {
  children: ReactNode;
  /** Makes the whole card tappable with a subtle press state. */
  onPress?: () => void;
  /** `flat` drops the shadow — for cards nested inside another card. */
  variant?: 'elevated' | 'flat' | 'primary';
  padding?: keyof typeof spacing | 'none';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * The white 24px-radius card with a soft lift that the whole reference design
 * is built from. `primary` is the dark teal-navy variant used for the
 * highlighted portfolio card.
 */
export function Card({
  children,
  onPress,
  variant = 'elevated',
  padding = 'lg',
  style,
  accessibilityLabel,
}: CardProps) {
  const base = [
    styles.card,
    variant === 'elevated' && shadows.card,
    variant === 'primary' && styles.primary,
    variant === 'primary' && shadows.card,
    padding !== 'none' && { padding: spacing[padding] },
    style,
  ];

  if (!onPress) {
    return <View style={base}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        ...base,
        pressed && styles.pressed,
        // Applied after `base` so it does not overwrite the primary variant's fill.
        pressed && variant !== 'primary' && styles.pressedSurface,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  pressed: {
    // Scale rather than opacity: opacity on Android also fades the shadow,
    // which makes the card look like it detached from the page.
    transform: [{ scale: 0.985 }],
  },
  pressedSurface: {
    backgroundColor: colors.surfaceAlt,
  },
});
