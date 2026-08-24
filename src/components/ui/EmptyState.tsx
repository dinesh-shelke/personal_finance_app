import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, text } from '@/theme';

import { PillButton } from './PillButton';

type EmptyStateProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  /** One sentence saying what to do next, not just that there's nothing here. */
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

/**
 * Shown wherever a list can legitimately be empty — a brand-new family member's
 * first launch, or a month with no activity.
 */
export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  return (
    <View style={[styles.root, compact && styles.compact]}>
      <View style={styles.bubble}>
        <Ionicons name={icon} size={compact ? 22 : 28} color={colors.textSecondary} />
      </View>

      <View style={styles.copy}>
        <Text style={[text.h3, styles.centered]}>{title}</Text>
        {message ? <Text style={[text.caption, styles.centered]}>{message}</Text> : null}
      </View>

      {actionLabel && onAction ? (
        <PillButton label={actionLabel} onPress={onAction} variant="primary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  compact: {
    paddingVertical: spacing.xl,
  },
  bubble: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    gap: spacing.xxs,
    maxWidth: 280,
  },
  centered: {
    textAlign: 'center',
  },
});
