import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') ?? '';
  const next = searchParams.get('next') ?? '/parent';
  const origin = request.nextUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const dest = type === 'recovery' ? '/reset-password' : next;
      return NextResponse.redirect(new URL(dest, origin));
    }
  }

  if (token_hash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'recovery' | 'email' | 'signup',
    });
    if (!error) {
      const dest = type === 'recovery' ? '/reset-password' : next;
      return NextResponse.redirect(new URL(dest, origin));
    }
  }

  return NextResponse.redirect(
    new URL('/login?error=Your+link+has+expired+or+is+invalid.+Please+try+again.', origin),
  );
}
