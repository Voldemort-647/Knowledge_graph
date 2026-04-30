import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/nodes - Create a new node
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { label, imageUrl, color, posX, posY } = body;

    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      return NextResponse.json(
        { error: 'Label is required' },
        { status: 400 }
      );
    }

    const node = await db.graphNode.create({
      data: {
        label: label.trim(),
        imageUrl: imageUrl || null,
        color: color || '#0d9488',
        posX: posX ?? 0,
        posY: posY ?? 0,
      },
    });

    return NextResponse.json(node, { status: 201 });
  } catch (error) {
    console.error('Error creating node:', error);
    return NextResponse.json(
      { error: 'Failed to create node' },
      { status: 500 }
    );
  }
}

// GET /api/nodes - Get all nodes
export async function GET() {
  try {
    const nodes = await db.graphNode.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(nodes);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nodes' },
      { status: 500 }
    );
  }
}

// DELETE /api/nodes?id=xxx - Delete a node by ID
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Node ID is required' },
        { status: 400 }
      );
    }

    // Delete associated edges first
    await db.graphEdge.deleteMany({
      where: {
        OR: [
          { sourceNodeId: id },
          { targetNodeId: id },
        ],
      },
    });

    await db.graphNode.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting node:', error);
    return NextResponse.json(
      { error: 'Failed to delete node' },
      { status: 500 }
    );
  }
}
