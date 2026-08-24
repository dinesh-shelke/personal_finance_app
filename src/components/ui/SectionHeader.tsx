import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, hitSlop, spacing, text } from '@/theme';

type SectionHeaderProps = {
  title: string;
  /** Right-hand link, e.g. "View all". */
  actionLabel?: string;
  onAction?: () => void;
};

/** The "My Portfolio" / "History … View all" heading row from the reference. */
export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={text.h2}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={hitSlop}
          accessibilityRole="link"
          accessibilityLabel={`${actionLabel} ${title}`}
        >
          <Text style={[text.caption, styles.action]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  action: {
    color: colors.primary,
  },
});
