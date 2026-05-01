import { NextRequest, NextResponse } from 'next/server';
import { updateGraphEdge } from '@/lib/graph-store';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, relationship, edgeType, animated, lineStyle, thickness } = body;

    if (!id) {
      return NextResponse.json({ error: 'Edge ID is required' }, { status: 400 });
    }

    const edge = await updateGraphEdge({
      id,
      relationship,
      edgeType,
      animated,
      lineStyle,
      thickness,
    });

    if (!edge) {
      return NextResponse.json({ error: 'Edge not found' }, { status: 404 });
    }

    return NextResponse.json(edge);
  } catch (error) {
    console.error('Error updating edge:', error);
    const message = error instanceof Error ? error.message : 'Failed to update edge';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
