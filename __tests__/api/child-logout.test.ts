/** @jest-environment node */
/** Tests for POST /api/child-logout */
import { POST } from '@/app/api/child-logout/route';

jest.mock('@/lib/child-session', () => ({
  getChildSessionCookieName: jest.fn(() => 'child_session'),
}));

const childSession = require('@/lib/child-session') as { getChildSessionCookieName: jest.Mock };

describe('POST /api/child-logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with ok: true and clears cookie', async () => {
    const res = await POST();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
    expect(childSession.getChildSessionCookieName).toHaveBeenCalled();
  });
});
