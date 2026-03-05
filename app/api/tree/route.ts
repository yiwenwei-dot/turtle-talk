/**
 * GET /api/tree — get tree state and wish list summary for current child (session).
 * Returns: { tree: ChildTreeRow | null, wishListSummary: { total, unlockedCount } }
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
    return NextResponse.json({ error: 'Tree not configured' }, { status: 503 });
  }

  const childId = session.childId;

  const { data: tree, error: treeError } = await supabase
    .from('child_tree')
    .select('child_id, placed_count, placed_decorations, growth_stage, last_unlock_at, updated_at')
    .eq('child_id', childId)
    .maybeSingle();

  if (treeError) {
    console.error('[tree] GET', treeError);
    return NextResponse.json({ error: 'Failed to load tree' }, { status: 500 });
  }

  const { count: totalWishes, error: wishError } = await supabase
    .from('wish_list')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId);

  const { count: unlockedCount, error: unlockedError } = await supabase
    .from('wish_list')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId)
    .not('unlocked_at', 'is', null);

  if (wishError || unlockedError) {
    // non-fatal; return tree with zeros
  }

  return NextResponse.json({
    tree: tree ?? null,
    wishListSummary: {
      total: totalWishes ?? 0,
      unlockedCount: unlockedCount ?? 0,
    },
  });
}
