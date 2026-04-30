import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface ImportNode {
  label: string;
  imageUrl?: string | null;
  color?: string;
  position?: { x: number; y: number };
}

interface ImportEdge {
  source: string;
  target: string;
  label?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nodes: importNodes, edges: importEdges } = body as {
      nodes?: ImportNode[];
      edges?: ImportEdge[];
    };

    if (!importNodes || !Array.isArray(importNodes)) {
      return NextResponse.json(
        { error: 'nodes array is required' },
        { status: 400 }
      );
    }

    // Get all existing nodes for label deduplication
    const existingNodes = await db.graphNode.findMany();
    const labelToId = new Map<string, string>();
    for (const n of existingNodes) {
      labelToId.set(n.label.toLowerCase(), n.id);
    }

    const TEAL = '#0d9488';
    const createdCount = { nodes: 0, edges: 0 };
    const skippedCount = { nodes: 0 };

    // MERGE-like logic: create nodes that don't exist by label, skip existing
    for (const importNode of importNodes) {
      const label = (importNode.label || '').trim();
      if (!label) continue;

      const normalizedLabel = label.toLowerCase();
      if (labelToId.has(normalizedLabel)) {
        skippedCount.nodes++;
        continue;
      }

      const newNode = await db.graphNode.create({
        data: {
          label,
          imageUrl: importNode.imageUrl || null,
          color: importNode.color || TEAL,
          posX: importNode.position?.x ?? Math.random() * 600 - 300,
          posY: importNode.position?.y ?? Math.random() * 400 - 200,
        },
      });
      labelToId.set(normalizedLabel, newNode.id);
      createdCount.nodes++;
    }

    // Create edges between nodes (resolve by label matching)
    if (importEdges && Array.isArray(importEdges)) {
      // Skip duplicate edges
      const existingEdges = await db.graphEdge.findMany();
      const edgeKeySet = new Set<string>();
      for (const e of existingEdges) {
        edgeKeySet.add(`${e.sourceNodeId}|${e.targetNodeId}|${e.relationship.toLowerCase()}`);
      }

      for (const importEdge of importEdges) {
        const sourceLabel = (importEdge.source || '').trim().toLowerCase();
        const targetLabel = (importEdge.target || '').trim().toLowerCase();
        if (!sourceLabel || !targetLabel) continue;
        if (sourceLabel === targetLabel) continue;

        const sourceId = labelToId.get(sourceLabel);
        const targetId = labelToId.get(targetLabel);
        if (!sourceId || !targetId) continue;

        const relationship = (importEdge.label || 'related').trim();
        const edgeKey = `${sourceId}|${targetId}|${relationship.toLowerCase()}`;
        if (edgeKeySet.has(edgeKey)) continue;

        await db.graphEdge.create({
          data: {
            sourceNodeId: sourceId,
            targetNodeId: targetId,
            relationship,
          },
        });
        edgeKeySet.add(edgeKey);
        createdCount.edges++;
      }
    }

    // Fetch the complete updated graph in React Flow format
    const allNodes = await db.graphNode.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const allEdges = await db.graphEdge.findMany({
      include: {
        sourceNode: true,
        targetNode: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const reactFlowNodes = allNodes.map((node) => ({
      id: node.id,
      type: 'customNode',
      position: { x: node.posX, y: node.posY },
      data: {
        label: node.label,
        imageUrl: node.imageUrl,
        color: node.color,
      },
    }));

    const reactFlowEdges = allEdges.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      label: edge.relationship,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#0d9488', strokeWidth: 2 },
      labelStyle: { fill: '#0d9488', fontSize: 12, fontWeight: 600 },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
      labelBgPadding: [8, 4] as [number, number],
      labelBgBorderRadius: 4,
    }));

    return NextResponse.json({
      success: true,
      message: `Imported ${createdCount.nodes} new nodes (${skippedCount.nodes} skipped) and ${createdCount.edges} edges`,
      nodes: reactFlowNodes,
      edges: reactFlowEdges,
    });
  } catch (error) {
    console.error('Error importing graph:', error);
    return NextResponse.json(
      { error: 'Failed to import graph' },
      { status: 500 }
    );
  }
}
