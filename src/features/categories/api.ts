import { supabase } from '@/lib/supabase';
import type { Category, CategoryKind, TablesUpdate } from '@/types/database';

/**
 * Category data access.
 *
 * Deleting a category does NOT delete its transactions — the foreign key is
 * `on delete set null (category_id)`, so history survives as "Uncategorised".
 * That is deliberate: losing financial records to a tidy-up is far worse than
 * an unlabelled row.
 */

export type CategoryInput = {
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
};

export class DuplicateCategoryNameError extends Error {
  constructor(name: string) {
    super(`You already have a category called "${name}".`);
    this.name = 'DuplicateCategoryNameError';
  }
}

const UNIQUE_VIOLATION = '23505';

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('kind', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listCategoriesByKind(kind: CategoryKind): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('kind', kind)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCategory(userId: string, input: CategoryInput): Promise<Category> {
  // Place new categories after the seeded ones, which use sort_order <= 170.
  const { data: last } = await supabase
    .from('categories')
    .select('sort_order')
    .eq('kind', input.kind)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name: input.name.trim(),
      kind: input.kind,
      icon: input.icon,
      color: input.color,
      is_system: false,
      sort_order: (last?.sort_order ?? 0) + 10,
    })
    .select()
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new DuplicateCategoryNameError(input.name.trim());
    throw new Error(error.message);
  }
  return data;
}

export async function updateCategory(
  categoryId: string,
  input: Partial<Omit<CategoryInput, 'kind'>>,
): Promise<Category> {
  // `kind` is intentionally not updatable: flipping an expense category to
  // income would silently reverse the sign of every past transaction on it.
  const patch: TablesUpdate<'categories'> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.icon !== undefined) patch.icon = input.icon;
  if (input.color !== undefined) patch.color = input.color;

  const { data, error } = await supabase
    .from('categories')
    .update(patch)
    .eq('id', categoryId)
    .select()
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION && input.name) {
      throw new DuplicateCategoryNameError(input.name.trim());
    }
    throw new Error(error.message);
  }
  return data;
}

/** Transactions keep their history and become Uncategorised. */
export async function deleteCategory(categoryId: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', categoryId);
  if (error) throw new Error(error.message);
}

/** How many transactions would become Uncategorised. Shown before deleting. */
export async function countCategoryTransactions(categoryId: string): Promise<number> {
  const { count, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
