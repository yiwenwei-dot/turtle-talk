/** @jest-environment node */
/** Tests for GET /api/child-session */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/child-session/route';

jest.mock('@/lib/child-session', () => ({
  getChildSessionCookieName: jest.fn(() => 'child_session'),
  parseChildSessionCookieValue: jest.fn(),
}));

const childSession = require('@/lib/child-session') as {
  getChildSessionCookieName: jest.Mock;
  parseChildSessionCookieValue: jest.Mock;
};

describe('GET /api/child-session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns child: null when no cookie', async () => {
    const req = new NextRequest('http://localhost/api/child-session');
    childSession.parseChildSessionCookieValue.mockReturnValue(null);

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ child: null });
    expect(childSession.parseChildSessionCookieValue).toHaveBeenCalledWith(undefined);
  });

  it('returns child: null when cookie is invalid', async () => {
    const req = new NextRequest('http://localhost/api/child-session', {
      headers: { Cookie: 'child_session=invalid' },
    });
    childSession.parseChildSessionCookieValue.mockReturnValue(null);

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ child: null });
  });

  it('returns child object when cookie is valid', async () => {
    const session = { childId: 'cid-1', firstName: 'Sam', emoji: '🐢' };
    childSession.parseChildSessionCookieValue.mockReturnValue(session);

    const req = new NextRequest('http://localhost/api/child-session', {
      headers: { Cookie: 'child_session=valid-token' },
    });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.child).toEqual({
      childId: 'cid-1',
      firstName: 'Sam',
      emoji: '🐢',
    });
  });

  it('returns child: null on parse error', async () => {
    childSession.parseChildSessionCookieValue.mockImplementation(() => {
      throw new Error('bad');
    });
    const req = new NextRequest('http://localhost/api/child-session', {
      headers: { Cookie: 'child_session=bad' },
    });
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ child: null });
  });
});
