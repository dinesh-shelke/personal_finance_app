import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type TextStyle } from 'react-native';

import { colors, hitSlop, spacing, text } from '@/theme';
import { formatMoney, type TxnType } from '@/utils/money';

type AmountTextProps = {
  amount: number | string | null | undefined;
  currency?: string;
  locale?: string;
  size?: 'display' | 'displayLg' | 'h1' | 'h2' | 'h3' | 'body' | 'caption';
  /** Colour by direction: income green, expense red, transfer neutral. */
  txnType?: TxnType;
  showSign?: boolean;
  hideDecimals?: boolean;
  /** Replace the digits with dots and show a reveal control. */
  hidden?: boolean;
  onToggleHidden?: () => void;
  style?: TextStyle;
};

/**
 * Renders a money value. Handles the three things every amount on screen needs:
 * locale-correct formatting, direction colouring, and the eye-toggle privacy
 * mask from the reference's "Portfolio value" card.
 */
export function AmountText({
  amount,
  currency = 'INR',
  locale = 'en-IN',
  size = 'body',
  txnType,
  showSign = false,
  hideDecimals = false,
  hidden = false,
  onToggleHidden,
  style,
}: AmountTextProps) {
  const formatted = formatMoney(amount, { currency, locale, showSign, hideDecimals });
  const tint = txnType ? TINT[txnType] : undefined;

  // Fixed-width mask so toggling privacy on and off doesn't reflow the layout.
  const display = hidden ? '••••••' : formatted;

  const body = (
    <Text
      style={[text[size], tint ? { color: tint } : null, style]}
      numberOfLines={1}
      adjustsFontSizeToFit={size === 'display' || size === 'displayLg'}
      minimumFontScale={0.7}
      accessibilityLabel={hidden ? 'Amount hidden' : formatted}
    >
      {display}
    </Text>
  );

  if (!onToggleHidden) return body;

  return (
    <View style={styles.row}>
      {body}
      <Pressable
        onPress={onToggleHidden}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={hidden ? 'Show amounts' : 'Hide amounts'}
      >
        <Ionicons
          name={hidden ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const TINT: Record<TxnType, string> = {
  income: colors.positive,
  expense: colors.negative,
  transfer: colors.neutral,
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
