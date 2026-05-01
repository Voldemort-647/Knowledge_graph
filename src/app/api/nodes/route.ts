import { NextRequest, NextResponse } from 'next/server';
import { createGraphNode, deleteGraphNode, fetchStoredGraph } from '@/lib/graph-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { label, imageUrl, emoji, color, posX, posY } = body;

    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 });
    }

    const node = await createGraphNode({ label, imageUrl, emoji, color, posX, posY });
    return NextResponse.json(node, { status: 201 });
  } catch (error) {
    console.error('Error creating node:', error);
    return NextResponse.json({ error: 'Failed to create node' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { nodes } = await fetchStoredGraph();
    return NextResponse.json(nodes);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    return NextResponse.json({ error: 'Failed to fetch nodes' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Node ID is required' }, { status: 400 });
    }

    const deleted = await deleteGraphNode(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting node:', error);
    return NextResponse.json({ error: 'Failed to delete node' }, { status: 500 });
  }
}
