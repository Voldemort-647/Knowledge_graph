import { NextRequest, NextResponse } from 'next/server';
import { updateGraphNode } from '@/lib/graph-store';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, label, imageUrl, emoji, color } = body;

    if (!id) {
      return NextResponse.json({ error: 'Node ID is required' }, { status: 400 });
    }

    const node = await updateGraphNode({ id, label, imageUrl, emoji, color });
    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    return NextResponse.json(node);
  } catch (error) {
    console.error('Error updating node:', error);
    const message = error instanceof Error ? error.message : 'Failed to update node';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
