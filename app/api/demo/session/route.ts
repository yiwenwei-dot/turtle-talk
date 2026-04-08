import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminOptional } from '@/lib/supabase/server-admin';

type DemoSessionPayload = {
  demoId: string;
  childName?: string | null;
  ageGroup?: string | null;
  favoriteBook?: string;
  funFacts?: string[];
  completedMissionsCount?: number;
  wishChoice?: 'solo' | 'withParent' | 'withFriend' | null;
  topics?: string[];
  messagesSummary?: unknown;
  parentFeedback?: string | null;
  parentWantsFullVersion?: boolean | null;
  consentedAt?: string | null;
};

/**
 * POST /api/demo/session
 * Upserts a demo session record keyed by demoId.
 * Called from both the child demo flow and the parent demo experience.
 */
export async function POST(request: NextRequest) {
  let body: DemoSessionPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const demoId = typeof body.demoId === 'string' ? body.demoId.trim() : '';
  if (!demoId) {
    return NextResponse.json({ error: 'demoId is required' }, { status: 400 });
  }

  const admin = getSupabaseAdminOptional();
  if (!admin) {
    return NextResponse.json({ error: 'Demo storage not configured' }, { status: 503 });
  }

  const now = new Date().toISOString();

  const record: Record<string, unknown> = {
    demo_id: demoId,
    child_name: body.childName ?? null,
    age_group: body.ageGroup ?? null,
    favorite_book: body.favoriteBook ?? null,
    fun_facts: body.funFacts ?? null,
    completed_missions_count: body.completedMissionsCount ?? null,
    wish_choice: body.wishChoice ?? null,
    topics: body.topics ?? null,
    messages_summary: body.messagesSummary ?? null,
    last_seen_at: now,
  };

  if ('parentFeedback' in body) {
    record.parent_feedback = body.parentFeedback ?? null;
  }
  if ('parentWantsFullVersion' in body) {
    record.parent_wants_full_version = body.parentWantsFullVersion ?? null;
  }
  if ('consentedAt' in body) {
    record.consented_at = body.consentedAt ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await (admin as any)
    .from('demo_sessions')
    .upsert(record, { onConflict: 'demo_id' })
    .select('demo_id')
    .maybeSingle()) as { data: { demo_id: string } | null; error: { message: string } | null };

  if (error) {
    console.error('[demo/session] POST', error);
    return NextResponse.json({ error: 'Failed to save demo session' }, { status: 500 });
  }

  return NextResponse.json({ demoId: data?.demo_id ?? demoId }, { status: 200 });
}
