import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, text } from '@/theme';
import { formatPercent } from '@/utils/money';

type Tone = 'positive' | 'negative' | 'neutral';

type ChangeBadgeProps = {
  /** Percent change. Negative renders the rose down-arrow variant. */
  value: number | null;
  /** Override the tone when the sign alone doesn't tell the story. */
  tone?: Tone;
  /** Free-text instead of a percentage, e.g. "Transfer". */
  label?: string;
  size?: 'sm' | 'md';
};

/**
 * The small mint "▲ 2%" / rose "▼ 1,2%" pills from the reference.
 *
 * Colour alone does not convey the direction to a colour-blind user, so the
 * arrow glyph and the accessibility label both carry it too.
 */
export function ChangeBadge({ value, tone, label, size = 'sm' }: ChangeBadgeProps) {
  const resolvedTone: Tone =
    tone ?? (value === null ? 'neutral' : value >= 0 ? 'positive' : 'negative');
  const palette = PALETTE[resolvedTone];
  const body = label ?? formatPercent(value);

  const direction =
    resolvedTone === 'positive' ? 'up' : resolvedTone === 'negative' ? 'down' : null;

  return (
    <View
      style={[styles.badge, { backgroundColor: palette.bg }, size === 'md' && styles.md]}
      accessibilityLabel={direction ? `${direction} ${body}` : body}
    >
      {direction ? (
        <Ionicons
          name={direction === 'up' ? 'caret-up' : 'caret-down'}
          size={size === 'md' ? 12 : 10}
          color={palette.fg}
        />
      ) : null}
      <Text style={[size === 'md' ? text.caption : text.tiny, { color: palette.fg }]}>{body}</Text>
    </View>
  );
}

const PALETTE: Record<Tone, { bg: string; fg: string }> = {
  positive: { bg: colors.positiveBg, fg: colors.positive },
  negative: { bg: colors.negativeBg, fg: colors.negative },
  neutral: { bg: colors.neutralBg, fg: colors.neutral },
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  md: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
});
