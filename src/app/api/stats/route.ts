import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/stats - Get graph statistics
export async function GET() {
  try {
    const totalNodes = await db.graphNode.count();
    const totalEdges = await db.graphEdge.count();

    // Count nodes with images
    const nodesWithImages = await db.graphNode.count({
      where: { imageUrl: { not: null } },
    });

    // Find most connected nodes
    const allEdges = await db.graphEdge.findMany({
      select: { sourceNodeId: true, targetNodeId: true },
    });

    const connectionCount = new Map<string, number>();
    for (const edge of allEdges) {
      connectionCount.set(edge.sourceNodeId, (connectionCount.get(edge.sourceNodeId) || 0) + 1);
      connectionCount.set(edge.targetNodeId, (connectionCount.get(edge.targetNodeId) || 0) + 1);
    }

    // Get unique relationship types
    const uniqueRelationships = await db.graphEdge.findMany({
      select: { relationship: true },
      distinct: ['relationship'],
    });

    // Top connected nodes (limit 5)
    const topConnectedIds = [...connectionCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    const topNodes = topConnectedIds.length > 0
      ? await db.graphNode.findMany({
          where: { id: { in: topConnectedIds } },
        })
      : [];

    const topConnected = topNodes
      .map((n) => ({
        id: n.id,
        label: n.label,
        connections: connectionCount.get(n.id) || 0,
      }))
      .sort((a, b) => b.connections - a.connections);

    return NextResponse.json({
      totalNodes,
      totalEdges,
      nodesWithImages,
      uniqueRelationships: uniqueRelationships.map((r) => r.relationship),
      averageConnections: totalNodes > 0 ? (totalEdges * 2) / totalNodes : 0,
      topConnected,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
