import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PATCH /api/nodes/update - Update node label/color/image
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, label, imageUrl, color } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Node ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.graphNode.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Node not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (label !== undefined && typeof label === 'string' && label.trim().length > 0) {
      updateData.label = label.trim();
    }
    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl.trim() || null;
    }
    if (color !== undefined && typeof color === 'string') {
      updateData.color = color;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const node = await db.graphNode.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(node);
  } catch (error) {
    console.error('Error updating node:', error);
    return NextResponse.json(
      { error: 'Failed to update node' },
      { status: 500 }
    );
  }
}
