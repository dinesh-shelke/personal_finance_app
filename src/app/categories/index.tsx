import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  EmptyState,
  ListRow,
  PillButton,
  Screen,
  Segmented,
  Sheet,
  TextField,
} from '@/components/ui';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/features/categories/hooks';
import { colors, hitSlop, radius, spacing, swatches, text } from '@/theme';
import type { Category, CategoryKind } from '@/types/database';

const KINDS: { value: CategoryKind; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

/** Icons offered when creating a category. A curated set beats 1,300 Ionicons. */
const ICON_CHOICES = [
  'restaurant-outline',
  'basket-outline',
  'home-outline',
  'car-outline',
  'bus-outline',
  'receipt-outline',
  'medkit-outline',
  'bag-handle-outline',
  'game-controller-outline',
  'school-outline',
  'card-outline',
  'stats-chart-outline',
  'airplane-outline',
  'people-outline',
  'gift-outline',
  'cash-outline',
  'briefcase-outline',
  'laptop-outline',
  'barbell-outline',
  'paw-outline',
  'shirt-outline',
  'cut-outline',
  'wifi-outline',
  'pricetag-outline',
] as const;

export default function CategoriesScreen() {
  const router = useRouter();
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: categories = [], isLoading, error, refetch } = useCategories();
  const visible = useMemo(() => categories.filter((c) => c.kind === kind), [categories, kind]);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={text.h2}>Categories</Text>
        <View style={styles.spacer} />
      </View>

      <Segmented options={KINDS} value={kind} onChange={setKind} />

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load categories"
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      ) : visible.length === 0 ? (
        <Card variant="flat" padding="none" style={styles.list}>
          <EmptyState compact icon="pricetags-outline" title={`No ${kind} categories`} />
        </Card>
      ) : (
        <Card padding="sm" style={styles.list}>
          {visible.map((category, index) => (
            <View key={category.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <ListRow
                icon={category.icon as keyof typeof Ionicons.glyphMap}
                iconColor={category.color}
                title={category.name}
                subtitle={category.is_system ? 'Built in' : undefined}
                onPress={() => setEditing(category)}
                showChevron
              />
            </View>
          ))}
        </Card>
      )}

      <View style={styles.addButton}>
        <PillButton label={`Add ${kind} category`} icon="add" onPress={() => setCreating(true)} />
      </View>

      <CategoryEditor visible={creating} kind={kind} onClose={() => setCreating(false)} />

      <CategoryEditor
        visible={editing !== null}
        kind={kind}
        category={editing}
        onClose={() => setEditing(null)}
      />
    </Screen>
  );
}

/**
 * Create/edit sheet, shared by both flows.
 *
 * `kind` is fixed once a category exists: flipping an expense category to
 * income would reverse the sign of every transaction already filed under it.
 */
function CategoryEditor({
  visible,
  kind,
  category,
  onClose,
}: {
  visible: boolean;
  kind: CategoryKind;
  category?: Category | null;
  onClose: () => void;
}) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState<string>(category?.icon ?? 'pricetag-outline');
  const [color, setColor] = useState<string>(category?.color ?? swatches[0]);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the form whenever a different category is opened.
  const seedKey = category?.id ?? 'new';
  const [lastSeed, setLastSeed] = useState(seedKey);
  if (lastSeed !== seedKey) {
    setLastSeed(seedKey);
    setName(category?.name ?? '');
    setIcon(category?.icon ?? 'pricetag-outline');
    setColor(category?.color ?? swatches[0]);
    setError(null);
  }

  const isEditing = Boolean(category);
  const isPending = createCategory.isPending || updateCategory.isPending;

  const save = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Give the category a name.');
      return;
    }

    try {
      if (category) {
        await updateCategory.mutateAsync({
          id: category.id,
          input: { name, icon, color },
        });
      } else {
        await createCategory.mutateAsync({ name, kind, icon, color });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the category.');
    }
  };

  const confirmDelete = () => {
    if (!category) return;

    Alert.alert(
      `Delete "${category.name}"?`,
      'Transactions in this category are kept — they become Uncategorised.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory.mutateAsync(category.id);
              onClose();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not delete the category.');
            }
          },
        },
      ],
    );
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Edit category' : `New ${kind} category`}
    >
      <View style={styles.editorBody}>
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Groceries"
          autoCapitalize="words"
          maxLength={60}
          error={error ?? undefined}
        />

        <View style={styles.block}>
          <Text style={text.label}>Icon</Text>
          <View style={styles.iconGrid}>
            {ICON_CHOICES.map((choice) => {
              const selected = choice === icon;
              return (
                <Pressable
                  key={choice}
                  onPress={() => setIcon(choice)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={choice.replace('-outline', '')}
                  style={[
                    styles.iconTile,
                    selected && { backgroundColor: color, borderColor: color },
                  ]}
                >
                  <Ionicons
                    name={choice}
                    size={18}
                    color={selected ? colors.onPrimary : colors.textSecondary}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.block}>
          <Text style={text.label}>Colour</Text>
          <View style={styles.swatchRow}>
            {swatches.map((swatch) => {
              const selected = swatch === color;
              return (
                <Pressable
                  key={swatch}
                  onPress={() => setColor(swatch)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Colour ${swatch}`}
                  style={[styles.swatch, { backgroundColor: swatch }]}
                >
                  {selected ? (
                    <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <PillButton
          label={isEditing ? 'Save changes' : 'Create category'}
          onPress={save}
          loading={isPending}
        />

        {isEditing ? (
          <Pressable onPress={confirmDelete} style={styles.deleteRow} accessibilityRole="button">
            <Ionicons name="trash-outline" size={18} color={colors.negative} />
            <Text style={[text.body, styles.deleteLabel]}>Delete category</Text>
          </Pressable>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  spacer: {
    width: 24,
  },
  list: {
    marginTop: spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 50,
  },
  addButton: {
    marginTop: spacing.lg,
  },
  loader: {
    paddingVertical: spacing.xxl,
  },
  editorBody: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  block: {
    gap: spacing.xs,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
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
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  deleteLabel: {
    color: colors.negative,
  },
});
