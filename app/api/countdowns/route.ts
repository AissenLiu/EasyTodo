import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  buildCountdownSummary,
  normalizeCountdownRecord,
  normalizeCycleType,
  normalizeCycleValue,
  normalizeDisplayUnit,
  normalizeMode,
  normalizeTargetAt,
  normalizeTimeOfDay,
  sortCountdownsByDue,
} from '@/lib/countdowns';

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('activeOnly') === '1';
    const limit = Number(searchParams.get('limit') ?? '0');

    const rows = activeOnly
      ? await db.all('SELECT * FROM countdowns WHERE is_active = 1 ORDER BY updated_at DESC')
      : await db.all('SELECT * FROM countdowns ORDER BY updated_at DESC');

    const now = new Date();
    const records = rows.map((row) => normalizeCountdownRecord({
      ...row,
      is_active: Boolean(row.is_active),
    }));
    const sorted = sortCountdownsByDue(records, now);
    const limited = Number.isInteger(limit) && limit > 0 ? sorted.slice(0, limit) : sorted;

    const payload = limited.map((item) => {
      const summary = buildCountdownSummary(item, now);
      return {
        ...item,
        next_due_at: summary.nextDueAt,
        next_due_text: summary.nextDueText,
        remaining_text: summary.remainingText,
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Failed to fetch countdowns:', error);
    return NextResponse.json({ error: 'Failed to fetch countdowns' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = await getDb();

    const now = new Date().toISOString();
    const id = typeof body.id === 'string' && body.id.trim() ? body.id : createId();
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!name) {
      return NextResponse.json({ error: '倒计时名称不能为空' }, { status: 400 });
    }

    const mode = normalizeMode(body.mode);
    const displayUnit = normalizeDisplayUnit(body.display_unit);
    const cycleType = mode === 'cycle' ? normalizeCycleType(body.cycle_type) : null;
    const cycleValue = mode === 'cycle' ? normalizeCycleValue(cycleType, body.cycle_value) : null;
    const targetAt = mode === 'target' ? normalizeTargetAt(body.target_at) : null;
    const timeOfDay = mode === 'cycle' ? normalizeTimeOfDay(body.time_of_day) ?? '09:00' : null;
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const isActive = body.is_active === undefined ? true : Boolean(body.is_active);

    if (mode === 'target' && !targetAt) {
      return NextResponse.json({ error: '指定日期模式下，必须填写目标时间' }, { status: 400 });
    }
    if (mode === 'cycle' && !cycleType) {
      return NextResponse.json({ error: '固定周期模式下，必须填写周期类型' }, { status: 400 });
    }
    if (mode === 'cycle' && !cycleValue) {
      return NextResponse.json({ error: '固定周期模式下，必须填写周期值' }, { status: 400 });
    }

    await db.run(
      `INSERT INTO countdowns (
        id, name, description, display_unit, mode, target_at, cycle_type, cycle_value, time_of_day, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        description,
        displayUnit,
        mode,
        targetAt,
        cycleType,
        cycleValue,
        timeOfDay,
        isActive ? 1 : 0,
        now,
        now,
      ],
    );

    const created = normalizeCountdownRecord({
      id,
      name,
      description,
      display_unit: displayUnit,
      mode,
      target_at: targetAt,
      cycle_type: cycleType,
      cycle_value: cycleValue,
      time_of_day: timeOfDay,
      is_active: isActive,
      created_at: now,
      updated_at: now,
    });
    const summary = buildCountdownSummary(created, new Date());

    return NextResponse.json(
      {
        ...created,
        next_due_at: summary.nextDueAt,
        next_due_text: summary.nextDueText,
        remaining_text: summary.remainingText,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create countdown:', error);
    return NextResponse.json({ error: 'Failed to create countdown' }, { status: 500 });
  }
}
