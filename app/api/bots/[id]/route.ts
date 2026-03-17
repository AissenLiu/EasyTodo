import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, webhook } = await req.json();
    const db = await getDb();
    
    await db.run(
      'UPDATE bots SET name = ?, webhook = ? WHERE id = ?',
      [name, webhook, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update bot:', error);
    return NextResponse.json({ error: 'Failed to update bot' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    
    await db.run('DELETE FROM bots WHERE id = ?', [id]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete bot:', error);
    return NextResponse.json({ error: 'Failed to delete bot' }, { status: 500 });
  }
}
