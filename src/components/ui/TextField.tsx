import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, controlHeight, radius, spacing, text } from '@/theme';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  /** Validation message. Its presence is what puts the field in an error state. */
  error?: string;
  hint?: string;
  multiline?: boolean;
};

export function TextField({ label, error, hint, multiline, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.root}>
      {label ? <Text style={text.label}>{label}</Text> : null}

      <TextInput
        {...inputProps}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline, Boolean(error) && styles.inputError]}
        placeholderTextColor={colors.textMuted}
        // Announce the error to a screen reader rather than relying on the red
        // border alone.
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
      />

      {error ? (
        <Text style={[text.tiny, styles.error]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={text.tiny}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xxs,
  },
  input: {
    height: controlHeight.input,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    ...text.body,
  },
  multiline: {
    height: 96,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.negative,
  },
  error: {
    color: colors.negative,
  },
});
