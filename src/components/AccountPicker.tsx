import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AmountText, EmptyState, ListRow, Sheet } from '@/components/ui';
import { useAccountBalances } from '@/features/accounts/hooks';
import { accountTypeLabel } from '@/features/accounts/schema';
import { useMoneyFormat } from '@/features/profile/hooks';
import { colors, controlHeight, radius, spacing, text } from '@/theme';

type AccountPickerProps = {
  label: string;
  selectedId: string | null | undefined;
  onSelect: (accountId: string) => void;
  /** Hidden from the list — stops a transfer selecting its own source twice. */
  excludeId?: string | null;
  error?: string;
};

/**
 * Tap-to-open account selector.
 *
 * Shows each account's live balance while choosing, which is the question the
 * user actually has at that moment ("do I have enough in Cash?").
 */
export function AccountPicker({
  label,
  selectedId,
  onSelect,
  excludeId,
  error,
}: AccountPickerProps) {
  const { data: accounts = [], isLoading } = useAccountBalances();
  const { format } = useMoneyFormat();
  const [open, setOpen] = useState(false);

  const options = accounts.filter((a) => a.account_id !== excludeId);
  const selected = accounts.find((a) => a.account_id === selectedId);

  return (
    <View style={styles.root}>
      <Text style={text.label}>{label}</Text>

      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${selected?.name ?? 'None selected'}`}
        style={({ pressed }) => [
          styles.field,
          pressed && styles.fieldPressed,
          Boolean(error) && styles.fieldError,
        ]}
      >
        {selected ? (
          <>
            <View style={[styles.dot, { backgroundColor: selected.color ?? colors.primary }]} />
            <Text style={[text.body, styles.value]} numberOfLines={1}>
              {selected.name}
            </Text>
            <AmountText amount={selected.balance} size="caption" hideDecimals />
          </>
        ) : (
          <Text style={[text.body, styles.placeholder]}>
            {isLoading ? 'Loading accounts…' : 'Choose an account'}
          </Text>
        )}
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      {error ? (
        <Text style={[text.tiny, styles.error]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        {options.length === 0 ? (
          <EmptyState
            compact
            icon="wallet-outline"
            title="No accounts available"
            message="Add an account from the Profile tab first."
          />
        ) : (
          <ScrollView>
            {options.map((account) => (
              <ListRow
                key={account.account_id}
                icon={(account.icon ?? 'wallet-outline') as keyof typeof Ionicons.glyphMap}
                iconColor={account.color ?? colors.primary}
                title={account.name ?? 'Account'}
                subtitle={accountTypeLabel(account.type ?? 'bank')}
                onPress={() => {
                  onSelect(account.account_id as string);
                  setOpen(false);
                }}
                trailing={
                  <View style={styles.trailing}>
                    <Text style={text.caption}>
                      {format(account.balance, { hideDecimals: true })}
                    </Text>
                    {account.account_id === selectedId ? (
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    ) : null}
                  </View>
                }
              />
            ))}
          </ScrollView>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xxs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: controlHeight.input,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  fieldPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  fieldError: {
    borderColor: colors.negative,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
  },
  value: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    color: colors.textMuted,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  error: {
    color: colors.negative,
  },
});
