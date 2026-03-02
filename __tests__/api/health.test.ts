/** @jest-environment node */
/** Tests for GET /api/health */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/health/route';

jest.mock('@/lib/health', () => ({
  getCachedHealthResult: jest.fn(),
  runHealthChecks: jest.fn(),
  formatSummary: jest.fn((r: { ok: boolean }) => (r.ok ? 'OK' : 'Degraded')),
}));

const lib = require('@/lib/health') as {
  getCachedHealthResult: jest.Mock;
  runHealthChecks: jest.Mock;
  formatSummary: jest.Mock;
};

describe('GET /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with ok and summary from cache', async () => {
    lib.getCachedHealthResult.mockReturnValue({ ok: true, items: [] });
    lib.formatSummary.mockReturnValue('OK');

    const req = new NextRequest('http://localhost/api/health');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({ ok: true, summary: 'OK' });
    expect(lib.runHealthChecks).not.toHaveBeenCalled();
  });

  it('calls runHealthChecks when cache is empty', async () => {
    lib.getCachedHealthResult.mockReturnValue(null);
    lib.runHealthChecks.mockResolvedValue({ ok: true, items: [] });
    lib.formatSummary.mockReturnValue('OK');

    const req = new NextRequest('http://localhost/api/health');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({ ok: true, summary: 'OK' });
    expect(lib.runHealthChecks).toHaveBeenCalled();
  });

  it('includes details when verbose=1', async () => {
    const items = [{ id: 'foo', level: 'ok', message: 'Foo' }];
    lib.getCachedHealthResult.mockReturnValue({ ok: true, items });

    const req = new NextRequest('http://localhost/api/health?verbose=1');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.details).toEqual(items);
  });

  it('includes details when X-Health-Detail: 1 header', async () => {
    const items = [{ id: 'bar', level: 'warn', message: 'Bar' }];
    lib.getCachedHealthResult.mockReturnValue({ ok: true, items });

    const req = new NextRequest('http://localhost/api/health', {
      headers: { 'X-Health-Detail': '1' },
    });
    const res = await GET(req);
    const data = await res.json();

    expect(data.details).toEqual(items);
  });
});
