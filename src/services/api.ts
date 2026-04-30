// API service layer for Knowledge Graph Builder

export interface GraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    imageUrl?: string | null;
    color?: string;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, unknown>;
  labelStyle?: Record<string, unknown>;
  labelBgStyle?: Record<string, unknown>;
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;
  edgeType?: string;
  lineStyle?: string;
  thickness?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CreateNodeData {
  label: string;
  imageUrl?: string;
  color?: string;
  posX?: number;
  posY?: number;
}

export interface UpdateNodeData {
  id: string;
  label?: string;
  imageUrl?: string;
  color?: string;
}

export interface CreateEdgeData {
  sourceNodeId: string;
  targetNodeId: string;
  relationship: string;
  edgeType?: string;
  animated?: boolean;
  lineStyle?: string;
  thickness?: number;
}

export interface UpdateEdgeData {
  id: string;
  relationship?: string;
  edgeType?: string;
  animated?: boolean;
  lineStyle?: string;
  thickness?: number;
}

export interface NodePosition {
  id: string;
  posX: number;
  posY: number;
}

export interface NLPResponse {
  success: boolean;
  message: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface RawNode {
  id: string;
  label: string;
  imageUrl: string | null;
  color: string;
  posX: number;
  posY: number;
  createdAt: string;
  updatedAt: string;
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  nodesWithImages: number;
  uniqueRelationships: string[];
  averageConnections: number;
  topConnected: Array<{
    id: string;
    label: string;
    connections: number;
  }>;
}

// GET /api/graph
export async function fetchGraph(): Promise<GraphData> {
  const res = await fetch('/api/graph');
  if (!res.ok) throw new Error('Failed to fetch graph');
  return res.json();
}

// DELETE /api/graph/clear
export async function clearGraph(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/graph/clear', { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear graph');
  return res.json();
}

// GET /api/stats
export async function fetchStats(): Promise<GraphStats> {
  const res = await fetch('/api/stats');
  if (!res.ok) throw new Error('Failed to fetch statistics');
  return res.json();
}

// GET /api/nodes
export async function fetchNodes(): Promise<RawNode[]> {
  const res = await fetch('/api/nodes');
  if (!res.ok) throw new Error('Failed to fetch nodes');
  return res.json();
}

// POST /api/nodes
export async function createNode(data: CreateNodeData): Promise<RawNode> {
  const res = await fetch('/api/nodes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to create node' }));
    throw new Error(error.error || 'Failed to create node');
  }
  return res.json();
}

// PATCH /api/nodes/update
export async function updateNode(data: UpdateNodeData): Promise<RawNode> {
  const res = await fetch('/api/nodes/update', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to update node' }));
    throw new Error(error.error || 'Failed to update node');
  }
  return res.json();
}

// DELETE /api/nodes?id=xxx
export async function deleteNode(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/nodes?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete node');
  return res.json();
}

// PATCH /api/nodes/position
export async function updateNodePositions(
  positions: NodePosition[]
): Promise<{ success: boolean }> {
  const res = await fetch('/api/nodes/position', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ positions }),
  });
  if (!res.ok) throw new Error('Failed to update positions');
  return res.json();
}

// POST /api/edges
export async function createEdge(data: CreateEdgeData): Promise<unknown> {
  const res = await fetch('/api/edges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to create edge' }));
    throw new Error(error.error || 'Failed to create edge');
  }
  return res.json();
}

// PATCH /api/edges/update
export async function updateEdge(data: UpdateEdgeData): Promise<unknown> {
  const res = await fetch('/api/edges/update', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to update edge' }));
    throw new Error(error.error || 'Failed to update edge');
  }
  return res.json();
}

// DELETE /api/edges?id=xxx
export async function deleteEdge(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/edges?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete edge');
  return res.json();
}

// POST /api/nlp
export async function processNLP(prompt: string): Promise<NLPResponse> {
  const res = await fetch('/api/nlp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to process' }));
    throw new Error(error.error || 'Failed to process');
  }
  return res.json();
}

// POST /api/graph/import
export interface ImportGraphData {
  nodes: Array<{
    label: string;
    imageUrl?: string | null;
    color?: string;
    position?: { x: number; y: number };
  }>;
  edges: Array<{
    source: string;
    target: string;
    label?: string;
  }>;
}

export async function importGraph(data: ImportGraphData): Promise<NLPResponse> {
  const res = await fetch('/api/graph/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to import graph' }));
    throw new Error(error.error || 'Failed to import graph');
  }
  return res.json();
}
