import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper to compute stroke dash array from line style
function getStrokeDashArray(lineStyle: string): string | undefined {
  switch (lineStyle) {
    case 'dashed':
      return '8 4';
    case 'dotted':
      return '2 4';
    default:
      return undefined;
  }
}

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
        emoji: node.emoji,
        color: node.color,
      },
    }));

    const reactFlowEdges = edges.map((edge) => {
      const lineStyle = edge.lineStyle || 'solid';
      const thickness = edge.thickness || 2;
      const dashArray = getStrokeDashArray(lineStyle);

      return {
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        label: edge.relationship,
        type: edge.edgeType || 'smoothstep',
        animated: edge.animated !== false,
        style: {
          stroke: '#0d9488',
          strokeWidth: thickness,
          ...(dashArray ? { strokeDasharray: dashArray } : {}),
        },
        labelStyle: {
          fill: '#0d9488',
          fontSize: 12,
          fontWeight: 600,
        },
        labelBgStyle: {
          fill: '#ffffff',
          fillOpacity: 0.9,
        },
        labelBgPadding: [8, 4] as [number, number],
        labelBgBorderRadius: 4,
        edgeType: edge.edgeType || 'smoothstep',
        lineStyle,
        thickness,
      };
    });

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
