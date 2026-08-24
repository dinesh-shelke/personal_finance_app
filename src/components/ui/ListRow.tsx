import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, text } from '@/theme';

type ListRowProps = {
  title: string;
  subtitle?: string;
  /** Ionicons name for the circular icon bubble on the left. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Bubble tint. The icon itself is drawn in this colour at full strength. */
  iconColor?: string;
  /** Replaces the icon bubble entirely, e.g. with an avatar. */
  leading?: ReactNode;
  /** Right-hand side — usually an <AmountText> with a <ChangeBadge> beneath. */
  trailing?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The repeating row from the reference: a circular tinted icon, a two-line
 * title/subtitle block, and a right-aligned value.
 *
 * The icon bubble uses a 14%-alpha wash of `iconColor` so a user-chosen
 * category colour always stays legible against white.
 */
export function ListRow({
  title,
  subtitle,
  icon,
  iconColor = colors.primary,
  leading,
  trailing,
  onPress,
  showChevron = false,
  style,
}: ListRowProps) {
  const body = (
    <>
      {leading ??
        (icon ? (
          <View style={[styles.bubble, { backgroundColor: withAlpha(iconColor, 0.14) }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
        ) : null)}

      <View style={styles.textBlock}>
        <Text style={text.h3} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={text.caption} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      {showChevron ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, style]}>{body}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}
    >
      {body}
    </Pressable>
  );
}

/**
 * Blends a hex colour toward white at the given alpha.
 *
 * Real alpha would let the card behind it show through, which looks muddy when
 * rows sit on the `surfaceAlt` inset background; pre-blending against white
 * keeps every bubble the same weight.
 */
function withAlpha(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return colors.surfaceAlt;

  const int = parseInt(match[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;

  const blend = (channel: number) => Math.round(channel * alpha + 255 * (1 - alpha));
  return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  bubble: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 3,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.input,
  },
});
