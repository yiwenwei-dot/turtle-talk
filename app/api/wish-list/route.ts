/**
 * GET /api/wish-list — list wish list for a child.
 *   Query: childId (required for parent). If no childId and no child session, 400.
 *   Child: use session cookie childId (no auth). Parent: use auth, childId must be linked.
 * POST /api/wish-list — add item (parent only). Body: { childId, label, sortOrder? }
 * PATCH /api/wish-list — reorder or update (parent only). Body: { id, childId, label?, sortOrder? }
 * DELETE /api/wish-list — remove item (parent only). Body: { id } or query id=
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdminOptional } from '@/lib/supabase/server-admin';
import { getChildSessionCookieName, parseChildSessionCookieValue } from '@/lib/child-session';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const childIdParam = url.searchParams.get('childId');

  const cookieValue = request.cookies.get(getChildSessionCookieName())?.value;
  const session = parseChildSessionCookieValue(cookieValue);

  const supabaseAdmin = getSupabaseAdminOptional();

  if (session?.childId) {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Wish list not configured' }, { status: 503 });
    }
    const { data, error } = await supabaseAdmin
      .from('wish_list')
      .select('id, child_id, label, sort_order, unlocked_at, created_at')
      .eq('child_id', session.childId)
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('[wish-list] GET admin', error);
      return NextResponse.json({ error: 'Failed to load wish list' }, { status: 500 });
    }
    return NextResponse.json({ items: data ?? [] });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const childId = childIdParam?.trim();
  if (!childId) {
    return NextResponse.json({ error: 'childId is required for parent' }, { status: 400 });
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

  const { data, error } = await supabase
    .from('wish_list')
    .select('id, child_id, label, sort_order, unlocked_at, created_at')
    .eq('child_id', childId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[wish-list] GET parent', error);
    return NextResponse.json({ error: 'Failed to load wish list' }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { childId?: string; label?: string; sortOrder?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const childId = typeof body.childId === 'string' ? body.childId.trim() : '';
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  const sortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : 0;
  if (!childId || !label) {
    return NextResponse.json({ error: 'childId and label are required' }, { status: 400 });
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
    .from('wish_list')
    .insert({ child_id: childId, label, sort_order: sortOrder })
    .select('id, child_id, label, sort_order, unlocked_at, created_at')
    .single();

  if (error) {
    console.error('[wish-list] POST', error);
    return NextResponse.json({ error: error.message || 'Failed to add item' }, { status: 500 });
  }
  return NextResponse.json({ item: row });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { id?: string; childId?: string; label?: string; sortOrder?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  const childId = typeof body.childId === 'string' ? body.childId.trim() : '';
  if (!id || !childId) {
    return NextResponse.json({ error: 'id and childId are required' }, { status: 400 });
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

  const updates: { label?: string; sort_order?: number } = {};
  if (typeof body.label === 'string') updates.label = body.label.trim();
  if (typeof body.sortOrder === 'number') updates.sort_order = body.sortOrder;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from('wish_list')
    .update(updates)
    .eq('id', id)
    .eq('child_id', childId)
    .select('id, child_id, label, sort_order, unlocked_at, created_at')
    .single();

  if (error) {
    console.error('[wish-list] PATCH', error);
    return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 });
  }
  return NextResponse.json({ item: row });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  let id = url.searchParams.get('id');
  let childId = url.searchParams.get('childId');
  if (!id) {
    try {
      const body = await request.json();
      id = typeof body.id === 'string' ? body.id.trim() : '';
      childId = childId ?? (typeof body.childId === 'string' ? body.childId.trim() : '');
    } catch {
      // no body
    }
  }
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('wish_list')
    .select('child_id')
    .eq('id', id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }
  const cid = childId?.trim() || existing.child_id;

  const { data: link } = await supabase
    .from('parent_child')
    .select('child_id')
    .eq('parent_id', user.id)
    .eq('child_id', cid)
    .maybeSingle();

  if (!link) {
    return NextResponse.json({ error: 'Child not found or not linked' }, { status: 403 });
  }

  const { error } = await supabase.from('wish_list').delete().eq('id', id).eq('child_id', cid);
  if (error) {
    console.error('[wish-list] DELETE', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
