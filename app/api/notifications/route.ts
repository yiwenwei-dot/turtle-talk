/**
 * GET /api/notifications
 * Child-facing: returns notifications for the home page (e.g. messages from parent/Tammy).
 * No auth required so the kid home page can call it. Returns empty list until backend is wired.
 */
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ notifications: [] });
}
