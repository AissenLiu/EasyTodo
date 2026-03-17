import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    
    // Fetch all tasks ordered by date desc
    // Pinned tasks first, then by sort_order
    const rows = await db.all('SELECT * FROM tasks ORDER BY is_pinned DESC, date DESC, sort_order ASC, created_at DESC');
    
    // Group tasks by date
    const groupsMap = new Map();
    const pinnedGroup = { date: '置顶待办', tasks: [] as any[] };
    
    rows.forEach(row => {
      const task = {
        id: row.id,
        text: row.text,
        completed: Boolean(row.completed),
        sort_order: row.sort_order,
        created_at: row.created_at || '',
        reminder_time: row.reminder_time,
        reminder_type: row.reminder_type,
        bot_id: row.bot_id,
        is_reminded: Boolean(row.is_reminded),
        bot_mentions: row.bot_mentions || null,
        bot_mention_all: Boolean(row.bot_mention_all),
        bot_custom_message: row.bot_custom_message || null,
        is_pinned: Boolean(row.is_pinned),
        tag_text: row.tag_text || null,
        tag_color: row.tag_color || null
      };

      if (row.is_pinned) {
        pinnedGroup.tasks.push(task);
      } else {
        if (!groupsMap.has(row.date)) {
          groupsMap.set(row.date, { date: row.date, tasks: [] });
        }
        groupsMap.get(row.date).tasks.push(task);
      }
    });

    // Convert Map to Array
    const taskGroups = Array.from(groupsMap.values());
    if (pinnedGroup.tasks.length > 0) {
      taskGroups.unshift(pinnedGroup);
    }

    return NextResponse.json(taskGroups);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, text, completed, date, sort_order, created_at, reminder_time, reminder_type, bot_id, bot_mentions, bot_mention_all, bot_custom_message, is_pinned, tag_text, tag_color } = await req.json();
    const db = await getDb();
    const createdAt = created_at || new Date().toISOString();
    
    await db.run(
      'INSERT INTO tasks (id, text, completed, date, sort_order, created_at, reminder_time, reminder_type, bot_id, is_reminded, bot_mentions, bot_mention_all, bot_custom_message, is_pinned, tag_text, tag_color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, text, completed ? 1 : 0, date, sort_order || 0, createdAt, reminder_time || null, reminder_type || null, bot_id || null, 0, bot_mentions || null, bot_mention_all ? 1 : 0, bot_custom_message || null, is_pinned ? 1 : 0, tag_text || null, tag_color || null]
    );

    return NextResponse.json({ id, text, completed, date, sort_order, created_at: createdAt, reminder_time, reminder_type, bot_id, is_reminded: false, bot_mentions: bot_mentions || null, bot_mention_all: !!bot_mention_all, bot_custom_message: bot_custom_message || null, is_pinned: !!is_pinned, tag_text: tag_text || null, tag_color: tag_color || null }, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
