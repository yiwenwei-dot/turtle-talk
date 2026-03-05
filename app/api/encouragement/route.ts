/**
 * GET /api/encouragement — list unused encouragement emojis for the current child (session).
 * Child session required; uses admin client to read parent_encouragement where child_id = session.childId and used_at is null.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminOptional } from '@/lib/supabase/server-admin';
import { getChildSessionCookieName, parseChildSessionCookieValue } from '@/lib/child-session';

export async function GET(request: NextRequest) {
  const cookieValue = request.cookies.get(getChildSessionCookieName())?.value;
  const session = parseChildSessionCookieValue(cookieValue);
  if (!session?.childId) {
    return NextResponse.json({ error: 'Child session required' }, { status: 401 });
  }

  const supabase = getSupabaseAdminOptional();
  if (!supabase) {
    return NextResponse.json({ error: 'Encouragement not configured' }, { status: 503 });
  }
  const { data, error } = await supabase
    .from('parent_encouragement')
    .select('id, emoji, created_at')
    .eq('child_id', session.childId)
    .is('used_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[encouragement] GET', error);
    return NextResponse.json({ error: 'Failed to load encouragement' }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}
