import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// In-memory store for presence and typing per team
// TeamId -> Map<userId, { name: string, isTyping: boolean, lastSeen: number }>
declare global {
  var teamPresenceStore: Map<
    string,
    Map<string, { name: string; isTyping: boolean; lastSeen: number }>
  > | undefined;
}

const presenceStore =
  globalThis.teamPresenceStore ||
  (globalThis.teamPresenceStore = new Map());

function getTeamMap(teamId: string) {
  let teamMap = presenceStore.get(teamId);
  if (!teamMap) {
    teamMap = new Map();
    presenceStore.set(teamId, teamMap);
  }
  return teamMap;
}

// Clean up stale users (> 10s inactivity)
function getActiveState(teamId: string, currentUserId: string) {
  const teamMap = getTeamMap(teamId);
  const now = Date.now();
  const onlineUsers: Array<{ userId: string; name: string; onlineAt: string }> = [];
  const typingUsers: string[] = [];

  teamMap.forEach(
    (
      info: { name: string; isTyping: boolean; lastSeen: number },
      uId: string
    ) => {
    // If last seen within 10 seconds, consider online
    if (now - info.lastSeen < 10000) {
      onlineUsers.push({
        userId: uId,
        name: info.name,
        onlineAt: new Date(info.lastSeen).toISOString(),
      });

      // If typed within 4 seconds and not self, consider typing
      if (info.isTyping && now - info.lastSeen < 4000 && uId !== currentUserId) {
        typingUsers.push(info.name);
      }
    } else {
      teamMap.delete(uId);
    }
  });

  return { onlineUsers, typingUsers };
}

// GET /api/teams/:id/presence
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id: teamId } = await params;
  const state = getActiveState(teamId, session.userId);
  return NextResponse.json(state);
}

// POST /api/teams/:id/presence - Heartbeat & typing status
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id: teamId } = await params;
  const body = await request.json().catch(() => ({}));
  const isTyping = Boolean(body.isTyping);

  const teamMap = getTeamMap(teamId);
  teamMap.set(session.userId, {
    name: session.name,
    isTyping,
    lastSeen: Date.now(),
  });

  const state = getActiveState(teamId, session.userId);
  return NextResponse.json(state);
}
