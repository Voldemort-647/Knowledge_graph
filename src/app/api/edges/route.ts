import { NextRequest, NextResponse } from 'next/server';
import { createGraphEdge, deleteGraphEdge } from '@/lib/graph-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sourceNodeId,
      targetNodeId,
      relationship,
      edgeType,
      animated,
      lineStyle,
      thickness,
    } = body;

    if (!sourceNodeId || !targetNodeId || !relationship) {
      return NextResponse.json(
        { error: 'sourceNodeId, targetNodeId, and relationship are required' },
        { status: 400 }
      );
    }

    const edge = await createGraphEdge({
      sourceNodeId,
      targetNodeId,
      relationship,
      edgeType,
      animated,
      lineStyle,
      thickness,
    });

    return NextResponse.json(edge, { status: 201 });
  } catch (error) {
    console.error('Error creating edge:', error);
    const message = error instanceof Error ? error.message : 'Failed to create edge';
    const status = message === 'This edge already exists' ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Edge ID is required' }, { status: 400 });
    }

    const deleted = await deleteGraphEdge(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Edge not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting edge:', error);
    return NextResponse.json({ error: 'Failed to delete edge' }, { status: 500 });
  }
}
