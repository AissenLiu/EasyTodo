import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM bots ORDER BY created_at ASC');
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to fetch bots:', error);
    return NextResponse.json({ error: 'Failed to fetch bots' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, name, webhook } = await req.json();
    const db = await getDb();
    
    await db.run(
      'INSERT INTO bots (id, name, webhook) VALUES (?, ?, ?)',
      [id, name, webhook]
    );

    return NextResponse.json({ success: true, id, name, webhook });
  } catch (error) {
    console.error('Failed to create bot:', error);
    return NextResponse.json({ error: 'Failed to create bot' }, { status: 500 });
  }
}
