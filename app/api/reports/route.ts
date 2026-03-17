import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'daily' or 'weekly'

    let rows;
    if (type) {
      rows = await db.all(
        'SELECT * FROM reports WHERE report_type = ? ORDER BY report_date DESC, created_at DESC',
        [type]
      );
    } else {
      rows = await db.all('SELECT * FROM reports ORDER BY report_date DESC, created_at DESC');
    }

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to fetch reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { content, report_type, report_date } = await req.json();
    const db = await getDb();
    const id = `${Date.now()}`;
    const created_at = new Date().toISOString();

    // Upsert: if same type+date exists, update it; otherwise insert
    const existing = await db.get(
      'SELECT id FROM reports WHERE report_type = ? AND report_date = ?',
      [report_type, report_date]
    );

    if (existing) {
      await db.run(
        'UPDATE reports SET content = ?, created_at = ? WHERE id = ?',
        [content, created_at, existing.id]
      );
      return NextResponse.json({ id: existing.id, content, report_type, report_date, created_at }, { status: 200 });
    } else {
      await db.run(
        'INSERT INTO reports (id, content, report_type, report_date, created_at) VALUES (?, ?, ?, ?, ?)',
        [id, content, report_type, report_date, created_at]
      );
      return NextResponse.json({ id, content, report_type, report_date, created_at }, { status: 201 });
    }
  } catch (error) {
    console.error('Failed to save report:', error);
    return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
  }
}
