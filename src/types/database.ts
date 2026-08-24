/**
 * Supabase schema types.
 *
 * Hand-authored to match `supabase/migrations/*.sql` so the app typechecks
 * before the hosted project exists. Once it does, this file is REGENERATED, not
 * edited:
 *
 *     npm run types:db
 *
 * CI runs that command and fails if the output differs from what is committed,
 * so schema drift cannot reach the app unnoticed.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          currency: string;
          locale: string;
          hide_balances: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          currency?: string;
          locale?: string;
          hide_balances?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          currency?: string;
          locale?: string;
          hide_balances?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: Database['public']['Enums']['account_type'];
          opening_balance: number;
          color: string;
          icon: string;
          is_archived: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type?: Database['public']['Enums']['account_type'];
          opening_balance?: number;
          color?: string;
          icon?: string;
          is_archived?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: Database['public']['Enums']['account_type'];
          opening_balance?: number;
          color?: string;
          icon?: string;
          is_archived?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'accounts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          kind: Database['public']['Enums']['category_kind'];
          icon: string;
          color: string;
          parent_id: string | null;
          is_system: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          kind: Database['public']['Enums']['category_kind'];
          icon?: string;
          color?: string;
          parent_id?: string | null;
          is_system?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          kind?: Database['public']['Enums']['category_kind'];
          icon?: string;
          color?: string;
          parent_id?: string | null;
          is_system?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_parent_same_user';
            columns: ['parent_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id', 'user_id'];
          },
          {
            foreignKeyName: 'categories_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          category_id: string | null;
          transfer_account_id: string | null;
          type: Database['public']['Enums']['transaction_type'];
          amount: number;
          occurred_at: string;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          category_id?: string | null;
          transfer_account_id?: string | null;
          type: Database['public']['Enums']['transaction_type'];
          amount: number;
          occurred_at?: string;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string;
          category_id?: string | null;
          transfer_account_id?: string | null;
          type?: Database['public']['Enums']['transaction_type'];
          amount?: number;
          occurred_at?: string;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_account_same_user';
            columns: ['account_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id', 'user_id'];
          },
          {
            foreignKeyName: 'transactions_category_same_user';
            columns: ['category_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id', 'user_id'];
          },
          {
            foreignKeyName: 'transactions_transfer_account_same_user';
            columns: ['transfer_account_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id', 'user_id'];
          },
          {
            foreignKeyName: 'transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      account_balances: {
        Row: {
          account_id: string | null;
          user_id: string | null;
          name: string | null;
          type: Database['public']['Enums']['account_type'] | null;
          color: string | null;
          icon: string | null;
          is_archived: boolean | null;
          sort_order: number | null;
          opening_balance: number | null;
          balance: number | null;
          inflow: number | null;
          outflow: number | null;
          transaction_count: number | null;
          last_transaction_at: string | null;
        };
        Relationships: [];
      };
      net_worth: {
        Row: {
          user_id: string | null;
          total_balance: number | null;
          total_assets: number | null;
          total_liabilities: number | null;
          account_count: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      monthly_summary: {
        Args: { p_from: string; p_to: string };
        Returns: {
          income: number;
          expense: number;
          net: number;
          transaction_count: number;
        }[];
      };
      category_breakdown: {
        Args: {
          p_from: string;
          p_to: string;
          p_kind?: Database['public']['Enums']['category_kind'];
        };
        Returns: {
          category_id: string | null;
          category_name: string;
          color: string;
          icon: string;
          total: number;
          transaction_count: number;
          share: number;
        }[];
      };
    };
    Enums: {
      account_type: 'cash' | 'bank' | 'credit_card' | 'wallet' | 'investment';
      category_kind: 'income' | 'expense';
      transaction_type: 'income' | 'expense' | 'transfer';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// ---------------------------------------------------------------------------
// Convenience aliases. Prefer these over reaching into `Database[...]` in app
// code, so a regenerated schema file only needs re-checking here.
// ---------------------------------------------------------------------------

type PublicSchema = Database['public'];

export type Tables<T extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])> =
  (PublicSchema['Tables'] & PublicSchema['Views'])[T] extends { Row: infer R } ? R : never;

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T] extends { Insert: infer I } ? I : never;

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T] extends { Update: infer U } ? U : never;

export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];

export type FunctionReturns<T extends keyof PublicSchema['Functions']> =
  PublicSchema['Functions'][T]['Returns'];

// Domain aliases used throughout the app.
export type Profile = Tables<'profiles'>;
export type Account = Tables<'accounts'>;
export type Category = Tables<'categories'>;
export type Transaction = Tables<'transactions'>;
export type AccountBalance = Tables<'account_balances'>;
export type NetWorth = Tables<'net_worth'>;

export type AccountType = Enums<'account_type'>;
export type CategoryKind = Enums<'category_kind'>;
export type TransactionType = Enums<'transaction_type'>;

export type MonthlySummary = FunctionReturns<'monthly_summary'>[number];
export type CategoryBreakdownRow = FunctionReturns<'category_breakdown'>[number];
