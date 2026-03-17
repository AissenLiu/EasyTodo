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
    
    await db.run(
      'UPDATE commands SET name = ?, description = ?, tasks = ? WHERE id = ?',
      [updates.name, updates.description, JSON.stringify(updates.tasks), id]
    );

    return NextResponse.json({ ...updates, id }, { status: 200 });
  } catch (error) {
    console.error('Failed to update command:', error);
    return NextResponse.json({ error: 'Failed to update command' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    
    await db.run('DELETE FROM commands WHERE id = ?', [id]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete command:', error);
    return NextResponse.json({ error: 'Failed to delete command' }, { status: 500 });
  }
}
