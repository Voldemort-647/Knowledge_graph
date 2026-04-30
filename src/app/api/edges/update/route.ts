import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PATCH /api/edges/update - Update edge relationship label
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, relationship } = body;

    if (!id || !relationship) {
      return NextResponse.json(
        { error: 'Edge ID and relationship are required' },
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

    const sanitizedRelationship = (relationship as string)
      .trim()
      .replace(/[^a-zA-Z0-9_\- ]/g, '')
      .substring(0, 50);

    if (sanitizedRelationship.length === 0) {
      return NextResponse.json(
        { error: 'Invalid relationship label' },
        { status: 400 }
      );
    }

    const edge = await db.graphEdge.update({
      where: { id },
      data: { relationship: sanitizedRelationship },
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
