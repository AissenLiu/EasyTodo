import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { normalizePomodoroSettings } from '@/lib/pomodoro';

type SettingsRow = {
  id: number;
  work_minutes: number;
  short_break_minutes: number;
  long_break_minutes: number;
  long_break_interval: number;
  updated_at: string;
};

export async function GET() {
  try {
    const db = await getDb();
    const row = (await db.get(
      'SELECT id, work_minutes, short_break_minutes, long_break_minutes, long_break_interval, updated_at FROM pomodoro_settings WHERE id = 1'
    )) as SettingsRow | undefined;

    return NextResponse.json(normalizePomodoroSettings(row));
  } catch (error) {
    console.error('Failed to fetch pomodoro settings:', error);
    return NextResponse.json({ error: 'Failed to fetch pomodoro settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as Partial<Record<keyof SettingsRow, unknown>>;
    const settings = normalizePomodoroSettings(payload);
    const updatedAt = new Date().toISOString();
    const db = await getDb();

    await db.run(
      `
        INSERT INTO pomodoro_settings (
          id, work_minutes, short_break_minutes, long_break_minutes, long_break_interval, updated_at
        )
        VALUES (1, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          work_minutes=excluded.work_minutes,
          short_break_minutes=excluded.short_break_minutes,
          long_break_minutes=excluded.long_break_minutes,
          long_break_interval=excluded.long_break_interval,
          updated_at=excluded.updated_at
      `,
      [
        settings.work_minutes,
        settings.short_break_minutes,
        settings.long_break_minutes,
        settings.long_break_interval,
        updatedAt
      ]
    );

    return NextResponse.json({
      ...settings,
      updated_at: updatedAt
    });
  } catch (error) {
    console.error('Failed to save pomodoro settings:', error);
    return NextResponse.json({ error: 'Failed to save pomodoro settings' }, { status: 500 });
  }
}
