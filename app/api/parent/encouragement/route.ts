/**
 * POST /api/parent/encouragement — send an emoji to a child (parent auth).
 * Body: { childId: string, emoji: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { childId?: string; emoji?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const childId = typeof body.childId === 'string' ? body.childId.trim() : '';
  const emoji = typeof body.emoji === 'string' ? body.emoji.trim() : '';
  if (!childId || !emoji) {
    return NextResponse.json({ error: 'childId and emoji are required' }, { status: 400 });
  }

  const { data: link } = await supabase
    .from('parent_child')
    .select('child_id')
    .eq('parent_id', user.id)
    .eq('child_id', childId)
    .maybeSingle();

  if (!link) {
    return NextResponse.json({ error: 'Child not found or not linked' }, { status: 403 });
  }

  const { data: row, error } = await supabase
    .from('parent_encouragement')
    .insert({ child_id: childId, from_parent_id: user.id, emoji })
    .select('id, child_id, emoji, created_at')
    .single();

  if (error) {
    console.error('[parent/encouragement] POST', error);
    return NextResponse.json({ error: error.message || 'Failed to send' }, { status: 500 });
  }
  return NextResponse.json({ item: row });
}
