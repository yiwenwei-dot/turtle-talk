/**
 * /api/admin/tattle-cards/display-settings
 * GET — public read of the global display settings
 * PUT — admin-only: update display settings
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
    showSkill: r.show_skill ?? false,
    showScenario: r.show_scenario ?? false,
    showCategory: r.show_category ?? false,
  };
}

export async function GET() {
  const admin = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('tattle_card_display_settings')
    .select('*')
    .eq('id', 'default')
    .single();

  if (error) {
    const isTableMissing =
      error.code === '42P01' || error.message?.includes('does not exist');
    if (isTableMissing)
      return NextResponse.json({
        showSkill: false,
        showScenario: false,
        showCategory: false,
      });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapRow(data as Record<string, unknown>));
}

export async function PUT(req: NextRequest) {
  const { err } = await requireAdmin();
  if (err) return err;

  const body = await req.json();
  const admin = getSupabaseAdmin();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.showSkill !== undefined) updates.show_skill = body.showSkill;
  if (body.showScenario !== undefined)
    updates.show_scenario = body.showScenario;
  if (body.showCategory !== undefined)
    updates.show_category = body.showCategory;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('tattle_card_display_settings')
    .update(updates)
    .eq('id', 'default')
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(mapRow(data as Record<string, unknown>));
}
