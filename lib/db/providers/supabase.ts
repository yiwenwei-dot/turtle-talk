/**
 * SupabaseDatabaseService
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Tables: missions, child_memory (see supabase/migrations/)
 * RLS: permissive (using (true)) — no auth required in first phase.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseService, ChildMemory, Mission, MissionSuggestion, CallFeedbackRecord } from '../types';

function getClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
}

export class SupabaseDatabaseService implements DatabaseService {
  private db: SupabaseClient;

  constructor() {
    this.db = getClient();
  }

  async getMissions(childId: string): Promise<Mission[]> {
    const { data, error } = await this.db
      .from('missions')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });
    if (error) {
      // 42P01 = relation "missions" does not exist (migrations not run). PostgREST also returns 404.
      const isTableMissing =
        error.code === '42P01' ||
        (error as { message?: string }).message?.includes('does not exist') ||
        (error as { message?: string }).message?.includes('404');
      if (isTableMissing) {
        console.warn(
          '[Supabase] missions table not found. Run supabase/migrations/001_initial.sql in the Supabase SQL Editor.',
        );
        return [];
      }
      throw error;
    }
    return (data ?? []).map(rowToMission);
  }

  async addMission(childId: string, suggestion: MissionSuggestion): Promise<Mission> {
    const row = {
      child_id: childId,
      title: suggestion.title,
      description: suggestion.description,
      theme: suggestion.theme,
      difficulty: suggestion.difficulty,
      status: 'active',
    };
    const { data, error } = await this.db.from('missions').insert(row).select().single();
    if (error) throw error;
    return rowToMission(data);
  }

  async completeMission(childId: string, missionId: string): Promise<void> {
    const { error } = await this.db
      .from('missions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', missionId)
      .eq('child_id', childId);
    if (error) throw error;
  }

  async deleteMission(childId: string, missionId: string): Promise<void> {
    const { error } = await this.db
      .from('missions')
      .delete()
      .eq('id', missionId)
      .eq('child_id', childId);
    if (error) throw error;
  }

  async getMemory(childId: string): Promise<ChildMemory> {
    const { data, error } = await this.db
      .from('child_memory')
      .select('*')
      .eq('child_id', childId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { childId, childName: null, messages: [], topics: [] };
    return {
      childId,
      childName: data.child_name ?? null,
      messages: data.messages ?? [],
      topics: data.topics ?? [],
    };
  }

  async saveChildName(childId: string, name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    await this.upsertMemory(childId, { child_name: trimmed });
  }

  async saveMessages(childId: string, messages: ChildMemory['messages']): Promise<void> {
    await this.upsertMemory(childId, { messages: messages.slice(-20) });
  }

  async addTopic(childId: string, topic: string): Promise<void> {
    const normalised = topic.trim().toLowerCase();
    if (!normalised) return;
    const memory = await this.getMemory(childId);
    const deduped = [normalised, ...memory.topics.filter((t) => t !== normalised)].slice(0, 15);
    await this.upsertMemory(childId, { topics: deduped });
  }

  async clearMemory(childId: string): Promise<void> {
    const { error } = await this.db
      .from('child_memory')
      .delete()
      .eq('child_id', childId);
    if (error) throw error;
  }

  async saveCallFeedback(record: CallFeedbackRecord): Promise<void> {
    const row = {
      child_id: record.childId,
      rating: record.rating,
      dismissed_at: record.dismissedAt,
      call_ended_at: record.callEndedAt,
      source: record.source,
      ...(record.timeToDismissMs != null && { time_to_dismiss_ms: record.timeToDismissMs }),
    };
    const { error } = await this.db.from('call_feedback').insert(row);
    if (error) {
      const isTableMissing =
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        (error as { message?: string }).message?.includes("call_feedback") &&
          (error as { message?: string }).message?.includes('does not exist');
      if (isTableMissing) {
        // Table hasn't been created in this Supabase project yet — degrade gracefully.
        // Admins can apply supabase/migrations/008_call_feedback.sql to enable persistence.
        console.warn(
          '[Supabase] call_feedback table not found. Run supabase/migrations/008_call_feedback.sql in your Supabase project.',
        );
        return;
      }
      throw error;
    }
  }

  private async upsertMemory(childId: string, patch: Record<string, unknown>): Promise<void> {
    const { error } = await this.db
      .from('child_memory')
      .upsert({ child_id: childId, ...patch }, { onConflict: 'child_id' });
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMission(row: any): Mission {
  return {
    id: String(row.id),
    title: row.title,
    description: row.description,
    theme: row.theme,
    difficulty: row.difficulty,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
  };
}
