import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    await db.run('DELETE FROM clipboard_history WHERE id = ?', [id]);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete clipboard item:', error);
    return NextResponse.json({ error: 'Failed to delete clipboard item' }, { status: 500 });
  }
}
