import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PATCH /api/nodes/position - Update node position after dragging
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { positions } = body; // [{ id: string, posX: number, posY: number }]

    if (!positions || !Array.isArray(positions)) {
      return NextResponse.json(
        { error: 'positions array is required' },
        { status: 400 }
      );
    }

    // Update positions in batch
    await Promise.all(
      positions.map(({ id, posX, posY }) =>
        db.graphNode.update({
          where: { id },
          data: { posX, posY },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating node positions:', error);
    return NextResponse.json(
      { error: 'Failed to update positions' },
      { status: 500 }
    );
  }
}
