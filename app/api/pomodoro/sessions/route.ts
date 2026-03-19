import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  isPomodoroSessionStatus,
  isPomodoroSessionType,
  normalizePlannedMinutes,
  type PomodoroSessionRecord
} from '@/lib/pomodoro';

type SessionRow = {
  id: string;
  session_type: string;
  planned_minutes: number;
  started_at: string;
  ended_at: string | null;
  status: string;
};

const normalizeSession = (row: SessionRow): PomodoroSessionRecord | null => {
  if (!isPomodoroSessionType(row.session_type)) return null;
  if (!isPomodoroSessionStatus(row.status)) return null;
  return {
    id: row.id,
    session_type: row.session_type,
    planned_minutes: normalizePlannedMinutes(row.planned_minutes),
    started_at: row.started_at,
    ended_at: row.ended_at,
    status: row.status
  };
};

export async function GET(req: NextRequest) {
  try {
    const limitParam = Number(req.nextUrl.searchParams.get('limit') ?? '20');
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(100, Math.trunc(limitParam)))
      : 20;
    const statusParam = req.nextUrl.searchParams.get('status');

    const db = await getDb();
    const rows = (statusParam === 'all'
      ? await db.all(
          `SELECT id, session_type, planned_minutes, started_at, ended_at, status
           FROM pomodoro_sessions
           ORDER BY started_at DESC
           LIMIT ?`,
          [limit]
        )
      : await db.all(
          `SELECT id, session_type, planned_minutes, started_at, ended_at, status
           FROM pomodoro_sessions
           WHERE status = 'completed'
           ORDER BY started_at DESC
           LIMIT ?`,
          [limit]
        )) as SessionRow[];

    const sessions = rows
      .map(normalizeSession)
      .filter((item): item is PomodoroSessionRecord => item !== null);

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Failed to fetch pomodoro sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch pomodoro sessions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (!isPomodoroSessionType(body.session_type)) {
      return NextResponse.json({ error: 'Invalid session_type' }, { status: 400 });
    }

    const status = isPomodoroSessionStatus(body.status) ? body.status : 'completed';
    const plannedMinutes = normalizePlannedMinutes(body.planned_minutes);
    const startedAt =
      typeof body.started_at === 'string' && body.started_at.trim()
        ? body.started_at
        : new Date().toISOString();
    const endedAt =
      typeof body.ended_at === 'string' && body.ended_at.trim()
        ? body.ended_at
        : new Date().toISOString();
    const id = typeof body.id === 'string' && body.id.trim() ? body.id : randomUUID();

    const db = await getDb();
    await db.run(
      `INSERT INTO pomodoro_sessions (id, session_type, planned_minutes, started_at, ended_at, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, body.session_type, plannedMinutes, startedAt, endedAt, status]
    );

    return NextResponse.json(
      {
        id,
        session_type: body.session_type,
        planned_minutes: plannedMinutes,
        started_at: startedAt,
        ended_at: endedAt,
        status
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create pomodoro session:', error);
    return NextResponse.json({ error: 'Failed to create pomodoro session' }, { status: 500 });
  }
}
