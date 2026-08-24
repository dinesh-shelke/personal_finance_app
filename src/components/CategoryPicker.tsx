import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { EmptyState } from '@/components/ui';
import { useCategoriesByKind } from '@/features/categories/hooks';
import { colors, radius, spacing, text } from '@/theme';
import type { CategoryKind } from '@/types/database';

type CategoryPickerProps = {
  kind: CategoryKind;
  selectedId: string | null | undefined;
  /** `null` clears the selection — Uncategorised is a valid choice. */
  onSelect: (categoryId: string | null) => void;
};

/**
 * Inline grid of categories, as in the reference's tile layout.
 *
 * A grid rather than a sheet: choosing the category is the second-most common
 * action after typing the amount, and it should not cost an extra tap. The
 * selected tile fills with the category's own colour so the choice reads at a
 * glance while the numpad still has focus.
 */
export function CategoryPicker({ kind, selectedId, onSelect }: CategoryPickerProps) {
  const { data: categories = [], isLoading } = useCategoriesByKind(kind);

  if (isLoading) {
    return <Text style={text.caption}>Loading categories…</Text>;
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        compact
        icon="pricetags-outline"
        title="No categories yet"
        message={`Add an ${kind} category from the Profile tab.`}
      />
    );
  }

  return (
    <ScrollView
      horizontal={false}
      style={styles.scroll}
      contentContainerStyle={styles.grid}
      showsVerticalScrollIndicator={false}
    >
      {categories.map((category) => {
        const selected = category.id === selectedId;

        return (
          <Pressable
            key={category.id}
            // Tapping the selected tile again clears it back to Uncategorised.
            onPress={() => onSelect(selected ? null : category.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={category.name}
            style={({ pressed }) => [
              styles.tile,
              selected && { backgroundColor: category.color, borderColor: category.color },
              pressed && !selected && styles.tilePressed,
            ]}
          >
            <Ionicons
              name={category.icon as keyof typeof Ionicons.glyphMap}
              size={18}
              color={selected ? colors.onPrimary : category.color}
            />
            <Text
              style={[text.tiny, selected ? styles.labelSelected : styles.label]}
              numberOfLines={1}
            >
              {category.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    // Roughly three rows of tiles; longer lists scroll inside this box rather
    // than pushing the Save button off screen.
    maxHeight: 176,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxWidth: '48%',
  },
  tilePressed: {
    backgroundColor: colors.surfaceAlt,
  },
  label: {
    color: colors.textPrimary,
    flexShrink: 1,
  },
  labelSelected: {
    color: colors.onPrimary,
    flexShrink: 1,
  },
});
