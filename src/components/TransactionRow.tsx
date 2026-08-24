import { Ionicons } from '@expo/vector-icons';

import { AmountText, ListRow } from '@/components/ui';
import type { TransactionWithRelations } from '@/features/transactions/api';
import { colors } from '@/theme';
import { formatTime } from '@/utils/date';

type TransactionRowProps = {
  transaction: TransactionWithRelations;
  onPress?: () => void;
  /** Show the time instead of the account name — used on an account's own page. */
  showTime?: boolean;
};

/**
 * One transaction in the history list.
 *
 * The icon and colour come from the category where there is one, and from the
 * type otherwise, so an Uncategorised row still reads clearly rather than
 * rendering a blank bubble.
 */
export function TransactionRow({ transaction, onPress, showTime = false }: TransactionRowProps) {
  const { type, amount, category, account, transfer_account, note, occurred_at } = transaction;

  const isTransfer = type === 'transfer';

  const icon = (
    isTransfer ? 'swap-horizontal-outline' : (category?.icon ?? FALLBACK_ICON[type])
  ) as keyof typeof Ionicons.glyphMap;

  const iconColor = isTransfer ? colors.neutral : (category?.color ?? FALLBACK_COLOR[type]);

  // Title: the category is the useful label for spending; a transfer is better
  // described by where the money went.
  const title = isTransfer
    ? `${account?.name ?? 'Account'} → ${transfer_account?.name ?? 'Account'}`
    : (category?.name ?? 'Uncategorised');

  // Subtitle carries the note when there is one — it is the most specific
  // information available ("Diwali gift" beats "Cash").
  const subtitle = note ?? (showTime ? formatTime(occurred_at) : (account?.name ?? undefined));

  return (
    <ListRow
      icon={icon}
      iconColor={iconColor}
      title={title}
      subtitle={subtitle}
      onPress={onPress}
      trailing={
        <AmountText
          amount={amount}
          size="h3"
          txnType={type}
          // A transfer is neither a gain nor a loss overall, so it gets no sign.
          showSign={!isTransfer}
        />
      }
    />
  );
}

const FALLBACK_ICON: Record<string, string> = {
  income: 'arrow-down-circle-outline',
  expense: 'arrow-up-circle-outline',
  transfer: 'swap-horizontal-outline',
};

const FALLBACK_COLOR: Record<string, string> = {
  income: colors.positive,
  expense: colors.negative,
  transfer: colors.neutral,
};
