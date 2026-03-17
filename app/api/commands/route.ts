import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM commands');
    
    const commands = rows.map(row => ({
      ...row,
      tasks: JSON.parse(row.tasks) // Parse the stringified JSON back to array
    }));

    return NextResponse.json(commands);
  } catch (error) {
    console.error('Failed to fetch commands:', error);
    return NextResponse.json({ error: 'Failed to fetch commands' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const command = await req.json();
    const db = await getDb();
    
    await db.run(
      'INSERT INTO commands (id, name, description, tasks) VALUES (?, ?, ?, ?)',
      [command.id, command.name, command.description, JSON.stringify(command.tasks)]
    );

    return NextResponse.json(command, { status: 201 });
  } catch (error) {
    console.error('Failed to create command:', error);
    return NextResponse.json({ error: 'Failed to create command' }, { status: 500 });
  }
}
