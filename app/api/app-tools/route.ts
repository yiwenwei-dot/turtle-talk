import { NextResponse } from 'next/server';

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json().catch(() => null)) as
      | { tool?: string; args?: unknown }
      | null;

    // Lightweight stub: log and acknowledge. Real routing will be added later.
    const tool = body?.tool ?? 'unknown';
    console.info('[app-tools] received tool call:', tool);

    return NextResponse.json({
      ok: true,
      message: 'App tool router stub: no tools are implemented yet.',
    });
  } catch (err) {
    console.error('[app-tools] failed to handle request:', err);
    return NextResponse.json(
      { error: 'Failed to handle app tool call' },
      { status: 500 },
    );
  }
}

