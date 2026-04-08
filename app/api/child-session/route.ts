/**
 * GET /api/child-session
 * Returns current child session from cookie (if valid). Used by client to get childId for useMissions/usePersonalMemory.
 * Also slides the idle-timeout window by re-issuing the cookie with a fresh iat (at most once per 5 min).
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  getChildSessionCookieName,
  parseChildSessionCookieValue,
  isSessionStale,
  touchSession,
} from '@/lib/child-session';

export async function GET(request: NextRequest) {
  try {
    const cookieValue = request.cookies.get(getChildSessionCookieName())?.value;
    const session = parseChildSessionCookieValue(cookieValue);
    if (!session) {
      return NextResponse.json({ child: null }, { status: 200 });
    }

    if (isSessionStale(session)) {
      const res = NextResponse.json({ child: null }, { status: 401 });
      res.cookies.delete(getChildSessionCookieName());
      return res;
    }

    const res = NextResponse.json({
      child: {
        childId: session.childId,
        firstName: session.firstName,
        emoji: session.emoji,
      },
    });
    touchSession(res, session);
    return res;
  } catch {
    return NextResponse.json({ child: null }, { status: 200 });
  }
}
