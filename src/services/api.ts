export interface GraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    imageUrl?: string | null;
    emoji?: string | null;
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

export interface RawNode {
  id: string;
  label: string;
  imageUrl: string | null;
  emoji: string | null;
  color: string;
  posX: number;
  posY: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNodeData {
  label: string;
  imageUrl?: string;
  emoji?: string;
  color?: string;
  posX?: number;
  posY?: number;
}

export interface UpdateNodeData {
  id: string;
  label?: string;
  imageUrl?: string;
  emoji?: string;
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

export interface NLPResponse {
  success: boolean;
  message: string;
  cypher?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ImportGraphData {
  nodes: Array<{
    label: string;
    imageUrl?: string | null;
    emoji?: string | null;
    color?: string | null;
    position?: { x: number; y: number };
  }>;
  edges: Array<{
    source: string;
    target: string;
    label?: string;
  }>;
}

async function getJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

export function fetchGraph(): Promise<GraphData> {
  return getJson('/api/graph');
}

export function fetchStats(): Promise<GraphStats> {
  return getJson('/api/stats');
}

export function fetchNodes(): Promise<RawNode[]> {
  return getJson('/api/nodes');
}

export function createNode(data: CreateNodeData): Promise<RawNode> {
  return getJson('/api/nodes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function updateNode(data: UpdateNodeData): Promise<RawNode> {
  return getJson('/api/nodes/update', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function deleteNode(id: string): Promise<{ success: boolean }> {
  return getJson(`/api/nodes?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function updateNodePositions(positions: NodePosition[]): Promise<{ success: boolean }> {
  return getJson('/api/nodes/position', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ positions }),
  });
}

export function createEdge(data: CreateEdgeData): Promise<unknown> {
  return getJson('/api/edges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function updateEdge(data: UpdateEdgeData): Promise<unknown> {
  return getJson('/api/edges/update', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function deleteEdge(id: string): Promise<{ success: boolean }> {
  return getJson(`/api/edges?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function clearGraph(): Promise<{ success: boolean; message: string }> {
  return getJson('/api/graph/clear', { method: 'DELETE' });
}

export function importGraph(data: ImportGraphData): Promise<NLPResponse> {
  return getJson('/api/graph/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function processNLP(prompt: string): Promise<NLPResponse> {
  return getJson('/api/nlp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
}
