import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/graph - Get complete graph formatted for React Flow
export async function GET() {
  try {
    const nodes = await db.graphNode.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const edges = await db.graphEdge.findMany({
      include: {
        sourceNode: true,
        targetNode: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Format for React Flow
    const reactFlowNodes = nodes.map((node) => ({
      id: node.id,
      type: 'customNode',
      position: {
        x: node.posX,
        y: node.posY,
      },
      data: {
        label: node.label,
        imageUrl: node.imageUrl,
        color: node.color,
      },
    }));

    const reactFlowEdges = edges.map((edge, index) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      label: edge.relationship,
      type: 'smoothstep',
      animated: true,
      style: {
        stroke: '#6366f1',
        strokeWidth: 2,
      },
      labelStyle: {
        fill: '#6366f1',
        fontSize: 12,
        fontWeight: 600,
      },
      labelBgStyle: {
        fill: '#ffffff',
        fillOpacity: 0.9,
      },
      labelBgPadding: [8, 4] as [number, number],
      labelBgBorderRadius: 4,
    }));

    return NextResponse.json({
      nodes: reactFlowNodes,
      edges: reactFlowEdges,
    });
  } catch (error) {
    console.error('Error fetching graph:', error);
    return NextResponse.json(
      { error: 'Failed to fetch graph' },
      { status: 500 }
    );
  }
}
