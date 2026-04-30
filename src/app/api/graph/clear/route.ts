import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// DELETE /api/graph/clear - Clear all nodes and edges from database
export async function DELETE() {
  try {
    await db.graphEdge.deleteMany({});
    await db.graphNode.deleteMany({});

    return NextResponse.json({ success: true, message: 'Graph cleared' });
  } catch (error) {
    console.error('Error clearing graph:', error);
    return NextResponse.json(
      { error: 'Failed to clear graph' },
      { status: 500 }
    );
  }
}
