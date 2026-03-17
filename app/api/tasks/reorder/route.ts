// app/api/tasks/reorder/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { updates } = await req.json(); // Array of { id, date, sort_order }
    const db = await getDb();
    
    // Begin transaction for bulk update
    await db.run('BEGIN TRANSACTION');
    
    try {
      for (const update of updates) {
        if (update.date === '置顶待办') {
          // If dragged into pinned list, ensure it's pinned, but don't overwrite its original date
          await db.run(
            'UPDATE tasks SET is_pinned = 1, sort_order = ? WHERE id = ?',
            [update.sort_order, update.id]
          );
        } else {
          // If dragged into a normal list, unpin it and update the date
          await db.run(
            'UPDATE tasks SET is_pinned = 0, date = ?, sort_order = ? WHERE id = ?',
            [update.date, update.sort_order, update.id]
          );
        }
      }
      await db.run('COMMIT');
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Failed to update task orders:', error);
    return NextResponse.json({ error: 'Failed to update task orders' }, { status: 500 });
  }
}
