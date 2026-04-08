/**
 * GET /api/parent/data-export — download all stored data for a linked child as JSON.
 * Query param: childId (required, must be linked to the authenticated parent).
 * Returns a downloadable JSON attachment.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId')?.trim() ?? '';
  if (!childId) {
    return NextResponse.json({ error: 'childId is required' }, { status: 400 });
  }

  // Verify parent owns this child
  const { data: link, error: linkError } = await supabase
    .from('parent_child')
    .select('child_id')
    .eq('parent_id', user.id)
    .eq('child_id', childId)
    .maybeSingle();

  if (linkError) {
    console.error('[data-export] ownership check', linkError);
    return NextResponse.json({ error: 'Failed to verify ownership' }, { status: 500 });
  }
  if (!link) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Collect child profile
  const { data: child, error: childError } = await supabase
    .from('children')
    .select('*')
    .eq('id', childId)
    .maybeSingle();

  if (childError) {
    console.error('[data-export] children', childError);
    return NextResponse.json({ error: 'Failed to load child profile' }, { status: 500 });
  }

  // Collect memory
  const { data: memory, error: memoryError } = await supabase
    .from('child_memory')
    .select('*')
    .eq('child_id', childId)
    .maybeSingle();

  if (memoryError) {
    console.error('[data-export] child_memory', memoryError);
    return NextResponse.json({ error: 'Failed to load memory' }, { status: 500 });
  }

  // Collect missions
  const { data: missions, error: missionsError } = await supabase
    .from('missions')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false });

  if (missionsError) {
    console.error('[data-export] missions', missionsError);
    return NextResponse.json({ error: 'Failed to load missions' }, { status: 500 });
  }

  // Collect wish list
  const { data: wishList, error: wishListError } = await supabase
    .from('wish_list')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false });

  if (wishListError) {
    console.error('[data-export] wish_list', wishListError);
    return NextResponse.json({ error: 'Failed to load wish list' }, { status: 500 });
  }

  // Collect encouragements (table may not exist in all environments)
  let encouragements: unknown[] = [];
  try {
    const { data, error } = await supabase
      .from('encouragements')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });
    if (!error) encouragements = data ?? [];
  } catch {
    // Table does not exist; skip gracefully
  }

  // Collect tree state (table may not exist in all environments)
  let treeState: unknown = null;
  try {
    const { data, error } = await supabase
      .from('child_tree')
      .select('*')
      .eq('child_id', childId)
      .maybeSingle();
    if (!error) treeState = data ?? null;
  } catch {
    // Table does not exist; skip gracefully
  }

  const exportDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const payload = {
    exportedAt: new Date().toISOString(),
    child,
    memory: memory ?? null,
    missions: missions ?? [],
    wishList: wishList ?? [],
    encouragements,
    treeState,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="turtletalk-${childId}-${exportDate}.json"`,
    },
  });
}
