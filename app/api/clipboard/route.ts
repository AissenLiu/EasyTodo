import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

type ClipboardRow = {
  id: string;
  content: string;
  content_hash: string;
  source: string;
  created_at: string;
};

function toSafeLimit(input: string | null) {
  const parsed = Number(input ?? '200');
  if (!Number.isFinite(parsed)) return 200;
  return Math.max(1, Math.min(500, Math.floor(parsed)));
}

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
    const limit = toSafeLimit(req.nextUrl.searchParams.get('limit'));

    const rows: ClipboardRow[] = q
      ? await db.all(
          `SELECT id, content, content_hash, source, created_at
           FROM clipboard_history
           WHERE content LIKE ?
           ORDER BY created_at DESC
           LIMIT ?`,
          [`%${q}%`, limit]
        )
      : await db.all(
          `SELECT id, content, content_hash, source, created_at
           FROM clipboard_history
           ORDER BY created_at DESC
           LIMIT ?`,
          [limit]
        );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to fetch clipboard history:', error);
    return NextResponse.json({ error: 'Failed to fetch clipboard history' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const rawContent = typeof payload?.content === 'string' ? payload.content : '';
    const content = rawContent.trim();

    if (!content) {
      return NextResponse.json({ error: 'Clipboard content is required' }, { status: 400 });
    }

    const source = typeof payload?.source === 'string' && payload.source.trim()
      ? payload.source.trim()
      : 'system';
    const contentHash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
    const db = await getDb();

    const latestRow = await db.get<ClipboardRow>(
      `SELECT id, content, content_hash, source, created_at
       FROM clipboard_history
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (latestRow && latestRow.content_hash === contentHash && latestRow.content === content) {
      return NextResponse.json({ ...latestRow, deduped: true });
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await db.run(
      `INSERT INTO clipboard_history (id, content, content_hash, source, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, content, contentHash, source, createdAt]
    );

    return NextResponse.json(
      {
        id,
        content,
        content_hash: contentHash,
        source,
        created_at: createdAt,
        deduped: false
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to save clipboard history:', error);
    return NextResponse.json({ error: 'Failed to save clipboard history' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const db = await getDb();
    const result = await db.run('DELETE FROM clipboard_history');
    const deleted = typeof result?.changes === 'number' ? result.changes : 0;
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error('Failed to clear clipboard history:', error);
    return NextResponse.json({ error: 'Failed to clear clipboard history' }, { status: 500 });
  }
}
