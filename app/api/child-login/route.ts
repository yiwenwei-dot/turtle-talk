/**
 * POST /api/child-login
 * Body: { loginKey: string, firstName: string, emoji: string }
 * Validates against children table (service role), sets httpOnly cookie, returns child info.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminOptional } from '@/lib/supabase/server-admin';
import {
  createChildSessionCookieValue,
  getChildSessionCookieName,
  getChildSessionCookieOptions,
} from '@/lib/child-session';

function normalizeKey(key: string): string {
  return key.trim().replace(/\s/g, '').toUpperCase().slice(0, 6);
}

function normalizeFirstName(name: string): string {
  return name.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const loginKey = typeof body.loginKey === 'string' ? body.loginKey : '';
    const firstName = typeof body.firstName === 'string' ? body.firstName : '';
    const emoji = typeof body.emoji === 'string' ? body.emoji : '';

    const key = normalizeKey(loginKey);
    const name = normalizeFirstName(firstName);
    if (!key || key.length !== 6 || !name || !emoji) {
      return NextResponse.json(
        { error: 'Invalid login key, first name, or emoji' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminOptional();
    if (!supabase) {
      return NextResponse.json(
        {
          error: 'Child login not configured',
          hint: 'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (see .env.example).',
        },
        { status: 503 }
      );
    }

    type ChildRow = { id: string; first_name: string; emoji: string; login_key: string };
    const { data: rows, error } = await supabase
      .from('children')
      .select('id, first_name, emoji, login_key')
      .eq('login_key', key)
      .limit(5);

    if (error) {
      console.error('[child-login] Supabase error', error);
      return NextResponse.json(
        { error: 'Unable to verify login' },
        { status: 500 }
      );
    }

    const child = ((rows ?? []) as ChildRow[]).find(
      (r) => normalizeFirstName(r.first_name) === name && r.emoji === emoji
    );

    if (!child) {
      return NextResponse.json(
        { error: 'Invalid code, name, or emoji' },
        { status: 401 }
      );
    }

    const cookieValue = createChildSessionCookieValue(
      child.id,
      child.first_name,
      child.emoji
    );
    const options = getChildSessionCookieOptions();
    const response = NextResponse.json({
      childId: child.id,
      firstName: child.first_name,
      emoji: child.emoji,
    });
    response.cookies.set(getChildSessionCookieName(), cookieValue, options);

    return response;
  } catch (err) {
    if (err instanceof Error && err.message.includes('CHILD_SESSION_SECRET')) {
      return NextResponse.json(
        {
          error: 'Child login not configured',
          hint: 'Set CHILD_SESSION_SECRET in .env.local (min 16 characters). See .env.example.',
        },
        { status: 503 }
      );
    }
    console.error('[child-login]', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
