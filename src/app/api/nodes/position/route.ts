import { NextRequest, NextResponse } from 'next/server';
import { updateNodePositions } from '@/lib/graph-store';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { positions } = body;

    if (!positions || !Array.isArray(positions)) {
      return NextResponse.json({ error: 'positions array is required' }, { status: 400 });
    }

    await updateNodePositions(positions);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating node positions:', error);
    return NextResponse.json({ error: 'Failed to update positions' }, { status: 500 });
  }
}
