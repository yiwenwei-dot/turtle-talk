import { NextRequest, NextResponse } from 'next/server';
import { AccessToken, RoomConfiguration, RoomAgentDispatch } from 'livekit-server-sdk';

/**
 * POST /api/livekit/token
 * Body: { roomName?: string, participantName?: string, childName?: string, topics?: string[] }
 * Returns: { token, roomName } for the client to join the LiveKit room.
 * Requires LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL in env.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey?.trim() || !apiSecret?.trim()) {
    return NextResponse.json(
      { error: 'LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set' },
      { status: 503 }
    );
  }

  let roomName: string;
  let participantName: string;
  let dispatchMetadata: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    roomName =
      typeof body.roomName === 'string' && body.roomName.trim()
        ? body.roomName.trim()
        : `talk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    participantName =
      typeof body.participantName === 'string' && body.participantName.trim()
        ? body.participantName.trim()
        : 'child';
    const childName =
      typeof body.childName === 'string' && body.childName.trim() ? body.childName.trim() : 'little explorer';
    const topics = Array.isArray(body.topics) ? (body.topics as string[]).filter((t): t is string => typeof t === 'string') : [];
    if (childName !== undefined || topics.length > 0) {
      dispatchMetadata = JSON.stringify({ childName: childName ?? null, topics });
    }
  } catch {
    roomName = `talk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    participantName = 'child';
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
      ttl: '1h',
    });
    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
    // Agent uses agentName: 'shelly', which turns off automatic dispatch. Request dispatch on join so the agent joins this room.
    at.roomConfig = new RoomConfiguration({
      agents: [new RoomAgentDispatch({ agentName: 'shelly', metadata: dispatchMetadata ?? '' })],
    });
    const token = await at.toJwt();

    const livekitUrl = process.env.LIVEKIT_URL ?? '';
    return NextResponse.json({ token, roomName, livekitUrl });
  } catch (err) {
    console.error('[livekit/token]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Token creation failed', detail: message },
      { status: 502 }
    );
  }
}
