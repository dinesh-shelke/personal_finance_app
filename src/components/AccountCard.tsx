import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AmountText } from '@/components/ui';
import { accountTypeLabel } from '@/features/accounts/schema';
import { colors, radius, shadows, spacing, text } from '@/theme';
import type { AccountBalance } from '@/types/database';

type AccountCardProps = {
  account: AccountBalance;
  onPress?: () => void;
  /** Fill with the account colour, as the reference highlights one card. */
  highlighted?: boolean;
  hideAmount?: boolean;
};

/**
 * A single account tile in the dashboard's horizontal carousel.
 *
 * A fixed width rather than a flexed one: the carousel deliberately shows the
 * next card partly cut off, which is what tells the user it scrolls.
 */
export function AccountCard({
  account,
  onPress,
  highlighted = false,
  hideAmount = false,
}: AccountCardProps) {
  const tint = account.color ?? colors.primary;
  const onTint = highlighted ? colors.onPrimary : colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${account.name}, ${accountTypeLabel(account.type ?? 'bank')}`}
      style={({ pressed }) => [
        styles.card,
        shadows.card,
        highlighted && { backgroundColor: tint },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.top}>
        <View
          style={[
            styles.bubble,
            { backgroundColor: highlighted ? 'rgba(255,255,255,0.18)' : colors.surfaceAlt },
          ]}
        >
          <Ionicons
            name={(account.icon ?? 'wallet-outline') as keyof typeof Ionicons.glyphMap}
            size={16}
            color={highlighted ? colors.onPrimary : tint}
          />
        </View>
        <Text
          style={[text.tiny, { color: highlighted ? colors.onPrimaryMuted : colors.textSecondary }]}
        >
          {accountTypeLabel(account.type ?? 'bank')}
        </Text>
      </View>

      <View style={styles.body}>
        <Text
          style={[text.caption, { color: highlighted ? colors.onPrimaryMuted : undefined }]}
          numberOfLines={1}
        >
          {account.name}
        </Text>
        <AmountText
          amount={account.balance}
          size="h2"
          hidden={hideAmount}
          style={{ color: onTint }}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 168,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bubble: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: 2,
  },
});
