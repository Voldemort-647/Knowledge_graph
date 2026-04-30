import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { CustomNodeData } from '@/components/graph/GraphCanvas';

export type LayoutDirection = 'TB' | 'LR' | 'RL' | 'BT';

export interface LayoutOptions {
  direction?: LayoutDirection;
  nodeWidth?: number;
  nodeHeight?: number;
  nodeSpacing?: number;
  rankSpacing?: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  direction: 'LR',
  nodeWidth: 220,
  nodeHeight: 80,
  nodeSpacing: 60,
  rankSpacing: 80,
};

/**
 * Apply dagre auto-layout to the given nodes and edges.
 * Returns new positioned nodes and the unchanged edges.
 */
export function getLayoutedElements(
  nodes: Node<CustomNodeData>[],
  edges: Edge[],
  direction: LayoutDirection = 'LR'
): { nodes: Node<CustomNodeData>[]; edges: Edge[] } {
  const opts = { ...DEFAULT_OPTIONS, direction };

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: opts.direction,
    nodesep: opts.nodeSpacing,
    ranksep: opts.rankSpacing,
  });

  // Add nodes to dagre
  nodes.forEach((node) => {
    g.setNode(node.id, { width: opts.nodeWidth, height: opts.nodeHeight });
  });

  // Add edges to dagre
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // Run the layout algorithm
  dagre.layout(g);

  // Map positions back to React Flow nodes
  const positionedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - opts.nodeWidth / 2,
        y: nodeWithPosition.y - opts.nodeHeight / 2,
      },
    };
  }) as Node<CustomNodeData>[];

  return { nodes: positionedNodes, edges };
}
