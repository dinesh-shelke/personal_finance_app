import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, controlHeight, radius, spacing, text } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type PillButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  /** Ionicons name, rendered before the label. */
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to fill the parent, as in the paired Buy/Sell row. */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The fully-rounded button from the reference. `primary` is the deep teal-navy
 * fill; `secondary` is the white outlined twin it sits beside.
 */
export function PillButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: PillButtonProps) {
  // A loading button must not fire again on a second tap.
  const isInert = disabled || loading;
  const palette = PALETTE[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isInert}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isInert, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border },
        variant === 'secondary' && styles.bordered,
        fullWidth && styles.fullWidth,
        pressed && !isInert && { backgroundColor: palette.pressedBg },
        isInert && styles.inert,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={18} color={palette.fg} /> : null}
          <Text style={[text.button, { color: palette.fg }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const PALETTE: Record<Variant, { bg: string; pressedBg: string; fg: string; border: string }> = {
  primary: {
    bg: colors.primary,
    pressedBg: colors.primaryDark,
    fg: colors.onPrimary,
    border: 'transparent',
  },
  secondary: {
    bg: colors.surface,
    pressedBg: colors.surfaceAlt,
    fg: colors.textPrimary,
    border: colors.border,
  },
  ghost: {
    bg: 'transparent',
    pressedBg: colors.surfaceAlt,
    fg: colors.primary,
    border: 'transparent',
  },
  danger: {
    bg: colors.negativeBg,
    pressedBg: '#FBD9D6',
    fg: colors.negative,
    border: 'transparent',
  },
};

const styles = StyleSheet.create({
  base: {
    height: controlHeight.pill,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  bordered: {
    borderWidth: 1,
  },
  fullWidth: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  inert: {
    opacity: 0.5,
  },
});
