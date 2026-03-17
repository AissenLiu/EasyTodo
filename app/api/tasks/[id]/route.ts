import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await req.json();
    const db = await getDb();
    
    // Check if updating completion status or text
    if (updates.text !== undefined) {
      await db.run(
        'UPDATE tasks SET text = ? WHERE id = ?',
        [updates.text, id]
      );
    } else if (updates.completed !== undefined) {
      await db.run(
        'UPDATE tasks SET completed = ? WHERE id = ?',
        [updates.completed ? 1 : 0, id]
      );
    } else if (updates.date !== undefined && updates.sort_order !== undefined) {
       await db.run(
        'UPDATE tasks SET date = ?, sort_order = ? WHERE id = ?',
        [updates.date, updates.sort_order, id]
      );
    } else if (updates.is_pinned !== undefined) {
      await db.run(
        'UPDATE tasks SET is_pinned = ? WHERE id = ?',
        [updates.is_pinned ? 1 : 0, id]
      );
    } else if (updates.tag_text !== undefined || updates.tag_color !== undefined) {
      // Partial updates for tags allowed, but usually both sent together
      const sets = [];
      const values = [];
      if (updates.tag_text !== undefined) { sets.push('tag_text = ?'); values.push(updates.tag_text); }
      if (updates.tag_color !== undefined) { sets.push('tag_color = ?'); values.push(updates.tag_color); }
      
      if (sets.length > 0) {
        values.push(id);
        await db.run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, values);
      }
    } else if ('reminder_time' in updates || 'is_reminded' in updates) {
      // Dynamic build of update query since multiple fields could be set
      const sets = [];
      const values = [];
      
      if ('reminder_time' in updates) {
        sets.push('reminder_time = ?', 'reminder_type = ?', 'bot_id = ?');
        values.push(updates.reminder_time || null, updates.reminder_type || null, updates.bot_id || null);
        
        // Also update bot mentions when reminder configuration is saved/cleared
        sets.push('bot_mentions = ?', 'bot_mention_all = ?', 'bot_custom_message = ?');
        values.push(updates.bot_mentions || null, updates.bot_mention_all ? 1 : 0, updates.bot_custom_message || null);
      }
      if ('is_reminded' in updates) {
        sets.push('is_reminded = ?');
        values.push(updates.is_reminded ? 1 : 0);
      }
      
      if (sets.length > 0) {
        values.push(id);
        await db.run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, values);
      }
    }

    return NextResponse.json({ ...updates, id }, { status: 200 });
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    
    await db.run('DELETE FROM tasks WHERE id = ?', [id]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
