import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const row = await db.get('SELECT * FROM settings WHERE id = 1');
    if (!row) {
      return NextResponse.json({
        apiBase: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o'
      });
    }
    return NextResponse.json({
      apiBase: row.api_base,
      apiKey: row.api_key,
      model: row.model
    });
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { apiBase, apiKey, model } = await req.json();
    const db = await getDb();

    await db.run(`
      INSERT INTO settings (id, api_base, api_key, model)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET api_base=excluded.api_base, api_key=excluded.api_key, model=excluded.model
    `, [apiBase, apiKey, model]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
