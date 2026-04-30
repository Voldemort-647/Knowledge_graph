import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PATCH /api/edges/update - Update edge relationship label and/or style
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      relationship,
      edgeType,
      animated,
      lineStyle,
      thickness,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Edge ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.graphEdge.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Edge not found' },
        { status: 404 }
      );
    }

    // Build update data object with only provided fields
    const updateData: Record<string, unknown> = {};

    if (relationship !== undefined) {
      const sanitizedRelationship = String(relationship)
        .trim()
        .replace(/[^a-zA-Z0-9_\- ]/g, '')
        .substring(0, 50);

      if (sanitizedRelationship.length === 0) {
        return NextResponse.json(
          { error: 'Invalid relationship label' },
          { status: 400 }
        );
      }
      updateData.relationship = sanitizedRelationship;
    }

    if (edgeType !== undefined) {
      const validEdgeTypes = ['smoothstep', 'bezier', 'straight', 'step'];
      if (!validEdgeTypes.includes(edgeType)) {
        return NextResponse.json(
          { error: 'Invalid edge type. Must be one of: smoothstep, bezier, straight, step' },
          { status: 400 }
        );
      }
      updateData.edgeType = edgeType;
    }

    if (animated !== undefined) {
      if (typeof animated !== 'boolean') {
        return NextResponse.json(
          { error: 'Animated must be a boolean' },
          { status: 400 }
        );
      }
      updateData.animated = animated;
    }

    if (lineStyle !== undefined) {
      const validLineStyles = ['solid', 'dashed', 'dotted'];
      if (!validLineStyles.includes(lineStyle)) {
        return NextResponse.json(
          { error: 'Invalid line style. Must be one of: solid, dashed, dotted' },
          { status: 400 }
        );
      }
      updateData.lineStyle = lineStyle;
    }

    if (thickness !== undefined) {
      const t = typeof thickness === 'number' ? thickness : parseInt(String(thickness), 10);
      if (isNaN(t) || t < 1 || t > 4) {
        return NextResponse.json(
          { error: 'Invalid thickness. Must be between 1 and 4' },
          { status: 400 }
        );
      }
      updateData.thickness = t;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const edge = await db.graphEdge.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(edge);
  } catch (error) {
    console.error('Error updating edge:', error);
    return NextResponse.json(
      { error: 'Failed to update edge' },
      { status: 500 }
    );
  }
}
