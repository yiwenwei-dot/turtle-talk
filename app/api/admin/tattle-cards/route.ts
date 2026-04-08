/**
 * /api/admin/tattle-cards
 * GET  — public read of active tattle cards (ordered by sort_order)
 * POST — admin-only: create a new card
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/server-admin';

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      err: NextResponse.json(
        { error: 'Unauthorized', code: 'invalid_session' },
        { status: 401 },
      ),
    };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin')
    return { err: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { err: null };
}

function mapRow(r: Record<string, unknown>) {
  return {
    id: r.id,
    emoji: r.emoji,
    title: r.title,
    description: r.description,
    skill: r.skill ?? null,
    scenario: r.scenario ?? null,
    category: r.category ?? null,
    isActive: r.is_active ?? true,
    sortOrder: r.sort_order ?? 0,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const includeAll = searchParams.get('all') === 'true';

  const admin = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from('tattle_cards')
    .select('*')
    .order('sort_order', { ascending: true });

  if (!includeAll) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    const isTableMissing =
      error.code === '42P01' || error.message?.includes('does not exist');
    if (isTableMissing) return NextResponse.json([]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    ((data as Record<string, unknown>[]) ?? []).map(mapRow),
  );
}

export async function POST(req: NextRequest) {
  const { err } = await requireAdmin();
  if (err) return err;

  const body = await req.json();
  const admin = getSupabaseAdmin();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('tattle_cards')
    .insert({
      id: body.id,
      emoji: body.emoji,
      title: body.title,
      description: body.description,
      skill: body.skill ?? null,
      scenario: body.scenario ?? null,
      category: body.category ?? null,
      is_active: body.isActive ?? true,
      sort_order: body.sortOrder ?? 0,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(mapRow(data as Record<string, unknown>), {
    status: 201,
  });
}

export async function PATCH(req: NextRequest) {
  const { err } = await requireAdmin();
  if (err) return err;

  const body = await req.json();
  if (!body.id)
    return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const admin = getSupabaseAdmin();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.emoji !== undefined) updates.emoji = body.emoji;
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.skill !== undefined) updates.skill = body.skill;
  if (body.scenario !== undefined) updates.scenario = body.scenario;
  if (body.category !== undefined) updates.category = body.category;
  if (body.isActive !== undefined) updates.is_active = body.isActive;
  if (body.sortOrder !== undefined) updates.sort_order = body.sortOrder;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('tattle_cards')
    .update(updates)
    .eq('id', body.id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(mapRow(data as Record<string, unknown>));
}

export async function DELETE(req: NextRequest) {
  const { err } = await requireAdmin();
  if (err) return err;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id)
    return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const admin = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('tattle_cards')
    .delete()
    .eq('id', id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
