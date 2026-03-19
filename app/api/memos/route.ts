import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { normalizeMemoTitle, sortMemosByUpdatedAt } from '@/lib/memos';

type MemoRow = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

function normalizeLimit(input: string | null) {
  const parsed = Number(input ?? '0');
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.max(1, Math.min(200, Math.trunc(parsed)));
}

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
    const limit = normalizeLimit(req.nextUrl.searchParams.get('limit'));

    const params: Array<string | number> = [];
    if (q) params.push(`%${q}%`, `%${q}%`);

    const baseSql = `
      SELECT id, title, content, created_at, updated_at
      FROM memos
      ${q ? 'WHERE title LIKE ? OR content LIKE ?' : ''}
      ORDER BY updated_at DESC
      ${limit ? 'LIMIT ?' : ''}
    `;

    if (limit) {
      params.push(limit);
    }

    const rows = (await db.all(baseSql, params)) as MemoRow[];
    return NextResponse.json(sortMemosByUpdatedAt(rows));
  } catch (error) {
    console.error('Failed to fetch memos:', error);
    return NextResponse.json({ error: 'Failed to fetch memos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const now = new Date().toISOString();
    const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : randomUUID();
    const content = typeof body.content === 'string' ? body.content : '';
    const title = normalizeMemoTitle(body.title, content);

    const db = await getDb();
    await db.run(
      `INSERT INTO memos (id, title, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, title, content, now, now]
    );

    return NextResponse.json(
      {
        id,
        title,
        content,
        created_at: now,
        updated_at: now,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create memo:', error);
    return NextResponse.json({ error: 'Failed to create memo' }, { status: 500 });
  }
}
