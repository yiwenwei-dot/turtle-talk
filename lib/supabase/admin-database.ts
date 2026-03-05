/**
 * Minimal Database type for the Supabase admin client.
 * Covers only tables/columns used by server-side admin code (e.g. post-login-check).
 * Extend as needed when adding more admin API usage.
 * Table shape must include Relationships for Supabase client typings.
 */
type TableShape<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: unknown[];
};

export interface AdminDatabase {
  public: {
    Tables: {
      profiles: TableShape<
        {
          id: string;
          role: string;
          display_name: string | null;
          access_status: string;
          suspended_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          role?: string;
          display_name?: string | null;
          access_status?: string;
          suspended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          role?: string;
          display_name?: string | null;
          access_status?: string;
          suspended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      feature_flags: TableShape<
        { key: string; enabled: boolean; updated_at: string },
        { key: string; enabled?: boolean; updated_at?: string },
        { key?: string; enabled?: boolean; updated_at?: string }
      >;
      waiting_list: TableShape<
        {
          id: string;
          email: string;
          status: string;
          created_at: string;
          invited_at: string | null;
          invited_by: string | null;
          approved_at: string | null;
          approved_by: string | null;
        },
        Record<string, unknown>,
        Record<string, unknown>
      >;
      children: TableShape<
        {
          id: string;
          first_name: string;
          emoji: string;
          login_key: string;
          created_at: string;
          updated_at: string;
        },
        Record<string, unknown>,
        Record<string, unknown>
      >;
      wish_list: TableShape<
        {
          id: string;
          child_id: string;
          label: string;
          sort_order: number;
          unlocked_at: string | null;
          created_at: string;
        },
        { child_id: string; label: string; sort_order?: number },
        { label?: string; sort_order?: number; unlocked_at?: string | null }
      >;
      parent_encouragement: TableShape<
        {
          id: string;
          child_id: string;
          from_parent_id: string;
          emoji: string;
          created_at: string;
          used_at: string | null;
        },
        { child_id: string; from_parent_id: string; emoji: string },
        { used_at?: string | null }
      >;
      child_tree: TableShape<
        {
          child_id: string;
          placed_count: number;
          placed_decorations: { emoji: string; slotId: string }[];
          growth_stage: number;
          last_unlock_at: string | null;
          created_at: string;
          updated_at: string;
        },
        { child_id: string; placed_count?: number; placed_decorations?: unknown; growth_stage?: number },
        { placed_count?: number; placed_decorations?: unknown; growth_stage?: number; last_unlock_at?: string | null }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
