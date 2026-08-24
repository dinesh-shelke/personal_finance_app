import { Ionicons } from '@expo/vector-icons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AccountPicker } from '@/components/AccountPicker';
import { CategoryPicker } from '@/components/CategoryPicker';
import { Numpad, PillButton, QuickAmounts, Segmented, TextField } from '@/components/ui';
import { useMoneyFormat } from '@/features/profile/hooks';
import { colors, hitSlop, radius, spacing, text } from '@/theme';
import type { TransactionType } from '@/types/database';
import { formatFullDate, formatTime } from '@/utils/date';
import { currencySymbol, parseAmountInput } from '@/utils/money';

import {
  emptyTransactionForm,
  transactionFormSchema,
  TRANSACTION_TYPES,
  type TransactionFormOutput,
  type TransactionFormValues,
} from './schema';

type TransactionFormProps = {
  initialValues?: TransactionFormValues;
  onSubmit: (values: TransactionFormOutput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  /** Server-side failure, e.g. a constraint the form could not anticipate. */
  submitError?: string | null;
  onDelete?: () => void;
};

/**
 * Add / edit a transaction.
 *
 * State is plain `useState` rather than react-hook-form: every input here is a
 * custom control (numpad, sheet pickers, tile grid) with no uncontrolled DOM
 * input for a form library to manage, so RHF would add indirection without
 * removing any code. Validation still goes through the zod schema, which is
 * what mirrors the database constraints.
 */
export function TransactionForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  isSubmitting = false,
  submitError,
  onDelete,
}: TransactionFormProps) {
  const { currency, locale, format } = useMoneyFormat();
  const [values, setValues] = useState<TransactionFormValues>(
    () => initialValues ?? emptyTransactionForm(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isTransfer = values.type === 'transfer';
  const symbol = currencySymbol(currency, locale);
  const parsedAmount = parseAmountInput(values.amount);

  const set = <K extends keyof TransactionFormValues>(key: K, value: TransactionFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    // Clear the field's error as soon as the user touches it; a stale red
    // message under a field they just fixed is worse than none.
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  };

  /**
   * Switching type has to clear the fields the new shape forbids, or the
   * `transactions_shape` CHECK rejects the insert with an opaque message.
   */
  const changeType = (type: TransactionType) => {
    setValues((current) => ({
      ...current,
      type,
      categoryId: type === 'transfer' ? null : current.categoryId,
      transferAccountId: type === 'transfer' ? current.transferAccountId : null,
    }));
    setErrors({});
  };

  const openDatePicker = () => {
    const current = new Date(values.occurredAt);

    if (Platform.OS !== 'android') {
      // iOS/web get the spinner variant; not reachable in the Android-only
      // build, but leaving the branch keeps the component portable.
      return;
    }

    DateTimePickerAndroid.open({
      value: current,
      mode: 'date',
      // No future-dating: this is a record of what happened, not a plan.
      maximumDate: new Date(),
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;

        // Keep the time of day from the original value so editing the date of
        // an old transaction does not silently move it to midnight.
        const merged = new Date(date);
        merged.setHours(current.getHours(), current.getMinutes(), 0, 0);
        set('occurredAt', merged.toISOString());
      },
    });
  };

  const handleSubmit = async () => {
    const result = transactionFormSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        // Keep the first message per field — later ones are usually redundant.
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    await onSubmit(result.data);
  };

  const quickAmounts = useMemo(() => QUICK_AMOUNTS, []);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Segmented
          options={TRANSACTION_TYPES}
          value={values.type}
          onChange={changeType}
          tints={{
            income: colors.positive,
            expense: colors.negative,
            transfer: colors.neutral,
          }}
        />

        {/* Amount readout — the oversized figure from the reference. */}
        <View style={styles.amountBlock}>
          <Text style={text.label}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={[text.displayLg, styles.symbol]}>{symbol}</Text>
            <Text
              style={[text.displayLg, !values.amount && styles.amountPlaceholder]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              accessibilityLabel={
                parsedAmount === null ? 'No amount entered' : format(parsedAmount)
              }
            >
              {values.amount || '0'}
            </Text>
          </View>
          {errors.amount ? (
            <Text style={[text.tiny, styles.error]} accessibilityLiveRegion="polite">
              {errors.amount}
            </Text>
          ) : null}
        </View>

        <QuickAmounts
          amounts={quickAmounts}
          onPick={(amount) => set('amount', amount)}
          formatAmount={(amount) => format(amount, { hideDecimals: true })}
        />

        <Numpad value={values.amount} onChange={(next) => set('amount', next)} />

        <AccountPicker
          label={isTransfer ? 'From account' : 'Account'}
          selectedId={values.accountId}
          onSelect={(id) => set('accountId', id)}
          error={errors.accountId}
        />

        {isTransfer ? (
          <AccountPicker
            label="To account"
            selectedId={values.transferAccountId}
            onSelect={(id) => set('transferAccountId', id)}
            excludeId={values.accountId}
            error={errors.transferAccountId}
          />
        ) : (
          <View style={styles.categoryBlock}>
            <View style={styles.categoryHeader}>
              <Text style={text.label}>Category</Text>
              {values.categoryId ? null : (
                <Text style={text.tiny}>Optional — saved as Uncategorised</Text>
              )}
            </View>
            <CategoryPicker
              kind={values.type === 'income' ? 'income' : 'expense'}
              selectedId={values.categoryId}
              onSelect={(id) => set('categoryId', id)}
            />
          </View>
        )}

        {/* Date */}
        <View style={styles.fieldBlock}>
          <Text style={text.label}>Date</Text>
          <Pressable
            onPress={openDatePicker}
            accessibilityRole="button"
            accessibilityLabel={`Date, ${formatFullDate(values.occurredAt)}`}
            style={({ pressed }) => [styles.dateField, pressed && styles.datePressed]}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={[text.body, styles.dateText]}>{formatFullDate(values.occurredAt)}</Text>
            <Text style={text.caption}>{formatTime(values.occurredAt)}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <TextField
          label="Note"
          value={values.note ?? ''}
          onChangeText={(note) => set('note', note)}
          placeholder="What was this for?"
          error={errors.note}
          multiline
          maxLength={500}
        />

        {submitError ? (
          <View style={styles.submitError} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle-outline" size={16} color={colors.negative} />
            <Text style={[text.caption, styles.error]}>{submitError}</Text>
          </View>
        ) : null}

        {onDelete ? (
          <Pressable
            onPress={onDelete}
            hitSlop={hitSlop}
            accessibilityRole="button"
            style={styles.deleteRow}
          >
            <Ionicons name="trash-outline" size={18} color={colors.negative} />
            <Text style={[text.body, styles.error]}>Delete transaction</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Actions pinned below the scroll area so Save is always reachable. */}
      <View style={styles.actions}>
        <PillButton label="Cancel" variant="secondary" onPress={onCancel} fullWidth />
        <PillButton
          label={submitLabel}
          onPress={handleSubmit}
          loading={isSubmitting}
          // Nothing to save until there is a usable amount.
          disabled={parsedAmount === null}
          fullWidth
        />
      </View>
    </View>
  );
}

/** Common round figures. Tuned for INR; revisit if other currencies land. */
const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollBody: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  amountBlock: {
    gap: spacing.xxs,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  symbol: {
    color: colors.textSecondary,
  },
  amountPlaceholder: {
    color: colors.textMuted,
  },
  categoryBlock: {
    gap: spacing.xxs,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldBlock: {
    gap: spacing.xxs,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 52,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  datePressed: {
    backgroundColor: colors.surfaceAlt,
  },
  dateText: {
    flex: 1,
  },
  submitError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.negativeBg,
    borderRadius: radius.input,
    padding: spacing.sm,
  },
  error: {
    color: colors.negative,
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
});
