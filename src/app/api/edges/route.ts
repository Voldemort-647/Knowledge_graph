import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/edges - Create a new edge
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

    // Sanitize relationship type - only allow alphanumeric and spaces
    const sanitizedRelationship = relationship
      .trim()
      .replace(/[^a-zA-Z0-9_\- ]/g, '')
      .substring(0, 50);

    if (sanitizedRelationship.length === 0) {
      return NextResponse.json(
        { error: 'Invalid relationship label' },
        { status: 400 }
      );
    }

    // Validate edge type
    const validEdgeTypes = ['smoothstep', 'bezier', 'straight', 'step'];
    const validatedEdgeType = validEdgeTypes.includes(edgeType)
      ? edgeType
      : 'smoothstep';

    // Validate line style
    const validLineStyles = ['solid', 'dashed', 'dotted'];
    const validatedLineStyle = validLineStyles.includes(lineStyle)
      ? lineStyle
      : 'solid';

    // Validate thickness
    const validatedThickness =
      typeof thickness === 'number' && thickness >= 1 && thickness <= 4
        ? thickness
        : 2;

    // Validate animated
    const validatedAnimated = typeof animated === 'boolean' ? animated : true;

    // Verify both nodes exist
    const [sourceNode, targetNode] = await Promise.all([
      db.graphNode.findUnique({ where: { id: sourceNodeId } }),
      db.graphNode.findUnique({ where: { id: targetNodeId } }),
    ]);

    if (!sourceNode) {
      return NextResponse.json(
        { error: 'Source node not found' },
        { status: 404 }
      );
    }

    if (!targetNode) {
      return NextResponse.json(
        { error: 'Target node not found' },
        { status: 404 }
      );
    }

    // Check for duplicate edge
    const existingEdge = await db.graphEdge.findFirst({
      where: {
        sourceNodeId,
        targetNodeId,
        relationship: sanitizedRelationship,
      },
    });

    if (existingEdge) {
      return NextResponse.json(
        { error: 'This edge already exists' },
        { status: 409 }
      );
    }

    const edge = await db.graphEdge.create({
      data: {
        relationship: sanitizedRelationship,
        sourceNodeId,
        targetNodeId,
        edgeType: validatedEdgeType,
        animated: validatedAnimated,
        lineStyle: validatedLineStyle,
        thickness: validatedThickness,
      },
      include: {
        sourceNode: true,
        targetNode: true,
      },
    });

    return NextResponse.json(edge, { status: 201 });
  } catch (error) {
    console.error('Error creating edge:', error);
    return NextResponse.json(
      { error: 'Failed to create edge' },
      { status: 500 }
    );
  }
}

// DELETE /api/edges?id=xxx - Delete an edge by ID
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Edge ID is required' },
        { status: 400 }
      );
    }

    await db.graphEdge.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting edge:', error);
    return NextResponse.json(
      { error: 'Failed to delete edge' },
      { status: 500 }
    );
  }
}
