/**
 * POST /api/tree/place — place one encouragement on the tree (child session).
 * Body: { encouragementId: string }
 * Marks encouragement used_at, updates or creates child_tree, increments placed_count.
 * When placed_count reaches DECORATIONS_TO_UNLOCK, unlocks the next locked wish_list item and resets count.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminOptional } from '@/lib/supabase/server-admin';
import { getChildSessionCookieName, parseChildSessionCookieValue } from '@/lib/child-session';

const DECORATIONS_TO_UNLOCK = 10;

export async function POST(request: NextRequest) {
  const cookieValue = request.cookies.get(getChildSessionCookieName())?.value;
  const session = parseChildSessionCookieValue(cookieValue);
  if (!session?.childId) {
    return NextResponse.json({ error: 'Child session required' }, { status: 401 });
  }

  const supabase = getSupabaseAdminOptional();
  if (!supabase) {
    return NextResponse.json({ error: 'Tree not configured' }, { status: 503 });
  }

  let body: { encouragementId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const encouragementId = typeof body.encouragementId === 'string' ? body.encouragementId.trim() : '';
  if (!encouragementId) {
    return NextResponse.json({ error: 'encouragementId is required' }, { status: 400 });
  }

  const childId = session.childId;

  const { data: enc, error: encError } = await supabase
    .from('parent_encouragement')
    .select('id, child_id, emoji')
    .eq('id', encouragementId)
    .is('used_at', null)
    .single();

  if (encError || !enc) {
    return NextResponse.json({ error: 'Encouragement not found or already used' }, { status: 404 });
  }
  if (enc.child_id !== childId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error: updateEncError } = await supabase
    .from('parent_encouragement')
    .update({ used_at: new Date().toISOString() })
    .eq('id', encouragementId);

  if (updateEncError) {
    console.error('[tree/place] update used_at', updateEncError);
    return NextResponse.json({ error: 'Failed to place' }, { status: 500 });
  }

  const { data: existing } = await supabase
    .from('child_tree')
    .select('child_id, placed_count, placed_decorations, growth_stage')
    .eq('child_id', childId)
    .maybeSingle();

  const placedDecorations = (existing?.placed_decorations as { emoji: string; slotId: string }[] | null) ?? [];
  const newSlotId = `slot-${placedDecorations.length}`;
  const newPlaced = [...placedDecorations, { emoji: enc.emoji, slotId: newSlotId }];
  let newCount = (existing?.placed_count ?? 0) + 1;
  let newStage = existing?.growth_stage ?? 0;
  let lastUnlockAt: string | null = existing?.last_unlock_at ?? null;

  if (newCount >= DECORATIONS_TO_UNLOCK) {
    const { data: nextLocked } = await supabase
      .from('wish_list')
      .select('id')
      .eq('child_id', childId)
      .is('unlocked_at', null)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextLocked) {
      await supabase
        .from('wish_list')
        .update({ unlocked_at: new Date().toISOString() })
        .eq('id', nextLocked.id);
      lastUnlockAt = new Date().toISOString();
    }
    newCount = 0;
    newPlaced.length = 0;
    newStage = Math.min(4, (existing?.growth_stage ?? 0) + 1);
  } else {
    newStage = Math.min(4, Math.floor(newCount / (DECORATIONS_TO_UNLOCK / 4)));
  }

  const payload = {
    placed_count: newCount,
    placed_decorations: newPlaced,
    growth_stage: newStage,
    ...(lastUnlockAt ? { last_unlock_at: lastUnlockAt } : {}),
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data: updated, error } = await supabase
      .from('child_tree')
      .update(payload)
      .eq('child_id', childId)
      .select()
      .single();
    if (error) {
      console.error('[tree/place] update tree', error);
      return NextResponse.json({ error: 'Failed to update tree' }, { status: 500 });
    }
    return NextResponse.json({ tree: updated, unlocked: newCount === 0 && !!lastUnlockAt });
  } else {
    const { data: inserted, error } = await supabase
      .from('child_tree')
      .insert({
        child_id: childId,
        placed_count: payload.placed_count,
        placed_decorations: payload.placed_decorations,
        growth_stage: payload.growth_stage,
        last_unlock_at: payload.last_unlock_at ?? null,
      })
      .select()
      .single();
    if (error) {
      console.error('[tree/place] insert tree', error);
      return NextResponse.json({ error: 'Failed to update tree' }, { status: 500 });
    }
    return NextResponse.json({ tree: inserted, unlocked: newCount === 0 && !!lastUnlockAt });
  }
}
