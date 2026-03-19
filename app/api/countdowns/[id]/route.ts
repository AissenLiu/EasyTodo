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
} from '@/lib/countdowns';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = await getDb();

    const existing = await db.get('SELECT * FROM countdowns WHERE id = ?', [id]);
    if (!existing) {
      return NextResponse.json({ error: '倒计时不存在' }, { status: 404 });
    }

    const current = normalizeCountdownRecord({
      ...existing,
      is_active: Boolean(existing.is_active),
    });

    const mode = body.mode !== undefined ? normalizeMode(body.mode) : current.mode;
    const displayUnit =
      body.display_unit !== undefined ? normalizeDisplayUnit(body.display_unit) : current.display_unit;
    const name = body.name !== undefined ? String(body.name ?? '').trim() : current.name;
    const description =
      body.description !== undefined ? String(body.description ?? '').trim() : current.description;
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : current.is_active;

    if (!name) {
      return NextResponse.json({ error: '倒计时名称不能为空' }, { status: 400 });
    }

    const cycleType =
      mode === 'cycle'
        ? normalizeCycleType(body.cycle_type !== undefined ? body.cycle_type : current.cycle_type)
        : null;
    const cycleValue =
      mode === 'cycle'
        ? normalizeCycleValue(
            cycleType,
            body.cycle_value !== undefined ? body.cycle_value : current.cycle_value,
          )
        : null;
    const targetAt =
      mode === 'target'
        ? normalizeTargetAt(body.target_at !== undefined ? body.target_at : current.target_at)
        : null;
    const timeOfDay =
      mode === 'cycle'
        ? normalizeTimeOfDay(body.time_of_day !== undefined ? body.time_of_day : current.time_of_day) ??
          '09:00'
        : null;

    if (mode === 'target' && !targetAt) {
      return NextResponse.json({ error: '指定日期模式下，必须填写目标时间' }, { status: 400 });
    }
    if (mode === 'cycle' && !cycleType) {
      return NextResponse.json({ error: '固定周期模式下，必须填写周期类型' }, { status: 400 });
    }
    if (mode === 'cycle' && !cycleValue) {
      return NextResponse.json({ error: '固定周期模式下，必须填写周期值' }, { status: 400 });
    }

    const updatedAt = new Date().toISOString();

    await db.run(
      `UPDATE countdowns
       SET name = ?, description = ?, display_unit = ?, mode = ?, target_at = ?, cycle_type = ?, cycle_value = ?, time_of_day = ?, is_active = ?, updated_at = ?
       WHERE id = ?`,
      [
        name,
        description,
        displayUnit,
        mode,
        targetAt,
        cycleType,
        cycleValue,
        timeOfDay,
        isActive ? 1 : 0,
        updatedAt,
        id,
      ],
    );

    const updated = normalizeCountdownRecord({
      ...current,
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
      updated_at: updatedAt,
    });
    const summary = buildCountdownSummary(updated, new Date());

    return NextResponse.json({
      ...updated,
      next_due_at: summary.nextDueAt,
      next_due_text: summary.nextDueText,
      remaining_text: summary.remainingText,
    });
  } catch (error) {
    console.error('Failed to update countdown:', error);
    return NextResponse.json({ error: 'Failed to update countdown' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = await getDb();
    await db.run('DELETE FROM countdowns WHERE id = ?', [id]);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete countdown:', error);
    return NextResponse.json({ error: 'Failed to delete countdown' }, { status: 500 });
  }
}
