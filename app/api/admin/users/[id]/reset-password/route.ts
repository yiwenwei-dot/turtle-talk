/**
 * POST /api/admin/users/[id]/reset-password
 * Sends a password-reset email to the specified user.
 * Requires admin role.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/server-admin';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const admin = getSupabaseAdmin();

  // Look up the target user's email via admin API
  const { data: targetUser, error: lookupErr } = await admin.auth.admin.getUserById(id);
  if (lookupErr || !targetUser?.user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const email = targetUser.user.email;
  if (!email) return NextResponse.json({ error: 'User has no email address' }, { status: 400 });

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/reset-password`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 });

  return NextResponse.json({ success: true });
}
