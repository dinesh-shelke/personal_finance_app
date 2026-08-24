import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PillButton, TextField } from '@/components/ui';
import { useMoneyFormat } from '@/features/profile/hooks';
import { colors, radius, spacing, swatches, text } from '@/theme';
import type { AccountType } from '@/types/database';

import {
  ACCOUNT_TYPES,
  accountFormSchema,
  type AccountFormOutput,
  type AccountFormValues,
} from './schema';

type AccountFormProps = {
  initialValues?: AccountFormValues;
  onSubmit: (values: AccountFormOutput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  submitError?: string | null;
  /** Rendered at the bottom — archive/delete for an existing account. */
  footer?: React.ReactNode;
};

export function AccountForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  isSubmitting = false,
  submitError,
  footer,
}: AccountFormProps) {
  const { currency } = useMoneyFormat();
  const [values, setValues] = useState<AccountFormValues>(
    () => initialValues ?? emptyAccountForm(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof AccountFormValues>(key: K, value: AccountFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  };

  /**
   * Picking a type also swaps the icon, unless the user already chose one.
   * A "Credit card" showing a cash-wallet glyph looks broken.
   */
  const changeType = (type: AccountType) => {
    const suggested = ACCOUNT_TYPES.find((t) => t.value === type)?.icon;
    const currentIsDefault = ACCOUNT_TYPES.some((t) => t.icon === values.icon);
    setValues((current) => ({
      ...current,
      type,
      icon: currentIsDefault && suggested ? suggested : current.icon,
    }));
  };

  const handleSubmit = async () => {
    const result = accountFormSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    await onSubmit(result.data);
  };

  const isCredit = values.type === 'credit_card';

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TextField
          label="Name"
          value={values.name}
          onChangeText={(name) => set('name', name)}
          placeholder="HDFC Savings"
          error={errors.name}
          maxLength={60}
          autoCapitalize="words"
        />

        <View style={styles.block}>
          <Text style={text.label}>Type</Text>
          <View style={styles.chipRow}>
            {ACCOUNT_TYPES.map((option) => {
              const selected = option.value === values.type;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => changeType(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={option.label}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Ionicons
                    name={option.icon as keyof typeof Ionicons.glyphMap}
                    size={16}
                    color={selected ? colors.onPrimary : colors.textSecondary}
                  />
                  <Text style={[text.caption, selected && styles.chipLabelSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextField
          label={`Opening balance (${currency})`}
          value={values.openingBalance}
          onChangeText={(v) => set('openingBalance', v)}
          placeholder="0"
          // No numeric keyboard type: a credit card's opening balance is
          // negative, and Android's numeric pad hides the minus sign.
          keyboardType="default"
          error={errors.openingBalance}
          hint={
            isCredit
              ? 'Enter what you currently owe as a negative number, e.g. -12500'
              : 'The balance before your first recorded transaction.'
          }
        />

        <View style={styles.block}>
          <Text style={text.label}>Colour</Text>
          <View style={styles.swatchRow}>
            {swatches.map((swatch) => {
              const selected = swatch === values.color;
              return (
                <Pressable
                  key={swatch}
                  onPress={() => set('color', swatch)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Colour ${swatch}`}
                  style={[
                    styles.swatch,
                    { backgroundColor: swatch },
                    selected && styles.swatchSelected,
                  ]}
                >
                  {selected ? (
                    <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          {errors.color ? <Text style={[text.tiny, styles.error]}>{errors.color}</Text> : null}
        </View>

        {submitError ? (
          <View style={styles.submitError} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle-outline" size={16} color={colors.negative} />
            <Text style={[text.caption, styles.error]}>{submitError}</Text>
          </View>
        ) : null}

        {footer}
      </ScrollView>

      <View style={styles.actions}>
        <PillButton label="Cancel" variant="secondary" onPress={onCancel} fullWidth />
        <PillButton label={submitLabel} onPress={handleSubmit} loading={isSubmitting} fullWidth />
      </View>
    </View>
  );
}

export function emptyAccountForm(): AccountFormValues {
  return {
    name: '',
    type: 'bank',
    openingBalance: '',
    color: swatches[0],
    icon: 'business-outline',
  };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  block: {
    gap: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabelSelected: {
    color: colors.onPrimary,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: colors.surface,
    // A ring so the selected swatch reads even when it matches the background.
    elevation: 3,
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
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
});
