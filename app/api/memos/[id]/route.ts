import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { normalizeMemoTitle } from '@/lib/memos';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const db = await getDb();

    const existing = await db.get(
      'SELECT id, title, content, created_at, updated_at FROM memos WHERE id = ?',
      [id]
    );

    if (!existing) {
      return NextResponse.json({ error: '备忘录不存在' }, { status: 404 });
    }

    const content = typeof body.content === 'string' ? body.content : existing.content;
    const title = normalizeMemoTitle(
      body.title !== undefined ? body.title : existing.title,
      content
    );
    const updatedAt = new Date().toISOString();

    await db.run(
      `UPDATE memos
       SET title = ?, content = ?, updated_at = ?
       WHERE id = ?`,
      [title, content, updatedAt, id]
    );

    return NextResponse.json({
      id,
      title,
      content,
      created_at: existing.created_at,
      updated_at: updatedAt,
    });
  } catch (error) {
    console.error('Failed to update memo:', error);
    return NextResponse.json({ error: 'Failed to update memo' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    await db.run('DELETE FROM memos WHERE id = ?', [id]);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete memo:', error);
    return NextResponse.json({ error: 'Failed to delete memo' }, { status: 500 });
  }
}
