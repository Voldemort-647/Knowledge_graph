import { randomUUID } from 'crypto';
import neo4j from 'neo4j-driver';
import { getNeo4jDriver, mapNode, mapRelationship, type StoredEdge, type StoredNode, toNumber } from '@/lib/neo4j';

export interface GraphNodeResponse {
  id: string;
  type: 'customNode';
  position: { x: number; y: number };
  data: {
    label: string;
    imageUrl: string | null;
    emoji: string | null;
    color: string;
  };
}

export interface GraphEdgeResponse {
  id: string;
  source: string;
  target: string;
  label: string;
  type: string;
  animated: boolean;
  style: {
    stroke: string;
    strokeWidth: number;
    strokeDasharray?: string;
  };
  labelStyle: {
    fill: string;
    fontSize: number;
    fontWeight: number;
  };
  labelBgStyle: {
    fill: string;
    fillOpacity: number;
  };
  labelBgPadding: [number, number];
  labelBgBorderRadius: number;
  edgeType: string;
  lineStyle: string;
  thickness: number;
}

export interface GraphDataResponse {
  nodes: GraphNodeResponse[];
  edges: GraphEdgeResponse[];
}

export interface GraphImportResponse extends GraphDataResponse {
  success: boolean;
  message: string;
}

export interface GraphNlpResponse extends GraphDataResponse {
  success: boolean;
  message: string;
  cypher: string;
}

export interface GraphStatsResponse {
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

function sanitizeRelationship(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_\- ]/g, '').slice(0, 50);
}

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

function formatNode(node: StoredNode): GraphNodeResponse {
  return {
    id: node.id,
    type: 'customNode',
    position: { x: node.posX, y: node.posY },
    data: {
      label: node.label,
      imageUrl: node.imageUrl,
      emoji: node.emoji,
      color: node.color,
    },
  };
}

function formatEdge(edge: StoredEdge): GraphEdgeResponse {
  const dashArray = getStrokeDashArray(edge.lineStyle === 'solid' ? 'dashed' : edge.lineStyle) || '8 4';
  return {
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    label: edge.relationship,
    type: edge.edgeType,
    animated: edge.animated,
    style: {
      stroke: '#0d9488',
      strokeWidth: edge.thickness,
      strokeDasharray: dashArray,
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
    labelBgPadding: [8, 4],
    labelBgBorderRadius: 999,
    edgeType: edge.edgeType,
    lineStyle: edge.lineStyle === 'solid' ? 'dashed' : edge.lineStyle,
    thickness: edge.thickness,
  };
}

async function ensureConstraints() {
  const session = getNeo4jDriver().session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    await session.run('CREATE CONSTRAINT graph_node_id IF NOT EXISTS FOR (n:GraphNode) REQUIRE n.id IS UNIQUE');
    await session.run('CREATE CONSTRAINT graph_edge_id IF NOT EXISTS FOR ()-[r:RELATES_TO]-() REQUIRE r.id IS UNIQUE');
  } finally {
    await session.close();
  }
}

export async function fetchStoredGraph(): Promise<{ nodes: StoredNode[]; edges: StoredEdge[] }> {
  await ensureConstraints();
  const session = getNeo4jDriver().session({ defaultAccessMode: neo4j.session.READ });

  try {
    const nodeResult = await session.run('MATCH (n:GraphNode) RETURN n ORDER BY n.createdAt ASC');
    const edgeResult = await session.run('MATCH ()-[r:RELATES_TO]->() RETURN r ORDER BY r.createdAt ASC');

    return {
      nodes: nodeResult.records.map((record) => mapNode(record.get('n'))),
      edges: edgeResult.records.map((record) => mapRelationship(record.get('r'))),
    };
  } finally {
    await session.close();
  }
}

export async function fetchGraphResponse(): Promise<GraphDataResponse> {
  const { nodes, edges } = await fetchStoredGraph();
  return {
    nodes: nodes.map(formatNode),
    edges: edges.map(formatEdge),
  };
}

export async function createGraphNode(input: {
  label: string;
  imageUrl?: string | null;
  emoji?: string | null;
  color?: string | null;
  posX?: number | null;
  posY?: number | null;
}): Promise<StoredNode> {
  await ensureConstraints();
  const session = getNeo4jDriver().session({ defaultAccessMode: neo4j.session.WRITE });

  try {
    const countResult = await session.run('MATCH (n:GraphNode) RETURN count(n) AS total');
    const total = toNumber(countResult.records[0]?.get('total'));
    const posX = input.posX ?? 140 + (total % 3) * 240;
    const posY = input.posY ?? 120 + Math.floor(total / 3) * 140;
    const now = new Date().toISOString();
    const result = await session.run(
      `
      CREATE (n:GraphNode {
        id: $id,
        label: $label,
        imageUrl: $imageUrl,
        emoji: $emoji,
        color: $color,
        posX: $posX,
        posY: $posY,
        createdAt: $createdAt,
        updatedAt: $updatedAt
      })
      RETURN n
      `,
      {
        id: randomUUID(),
        label: input.label.trim(),
        imageUrl: input.imageUrl?.trim() || null,
        emoji: input.emoji?.trim() || null,
        color: input.color || '#0d9488',
        posX,
        posY,
        createdAt: now,
        updatedAt: now,
      }
    );

    return mapNode(result.records[0].get('n'));
  } finally {
    await session.close();
  }
}

export async function updateGraphNode(input: {
  id: string;
  label?: string;
  imageUrl?: string | null;
  emoji?: string | null;
  color?: string;
}): Promise<StoredNode | null> {
  const session = getNeo4jDriver().session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    const result = await session.run(
      `
      MATCH (n:GraphNode {id: $id})
      SET
        n.label = coalesce($label, n.label),
        n.imageUrl = CASE WHEN $imageUrlProvided THEN $imageUrl ELSE n.imageUrl END,
        n.emoji = CASE WHEN $emojiProvided THEN $emoji ELSE n.emoji END,
        n.color = coalesce($color, n.color),
        n.updatedAt = $updatedAt
      RETURN n
      `,
      {
        id: input.id,
        label: input.label?.trim() || null,
        imageUrl: input.imageUrl?.trim() || null,
        emoji: input.emoji?.trim() || null,
        color: input.color || null,
        imageUrlProvided: input.imageUrl !== undefined,
        emojiProvided: input.emoji !== undefined,
        updatedAt: new Date().toISOString(),
      }
    );

    if (result.records.length === 0) return null;
    return mapNode(result.records[0].get('n'));
  } finally {
    await session.close();
  }
}

export async function deleteGraphNode(id: string): Promise<boolean> {
  const session = getNeo4jDriver().session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    const result = await session.run(
      `
      MATCH (n:GraphNode {id: $id})
      WITH count(n) AS deleted, collect(n) AS nodes
      FOREACH (node IN nodes | DETACH DELETE node)
      RETURN deleted
      `,
      { id }
    );
    return toNumber(result.records[0]?.get('deleted')) > 0;
  } finally {
    await session.close();
  }
}

export async function updateNodePositions(positions: Array<{ id: string; posX: number; posY: number }>): Promise<void> {
  const session = getNeo4jDriver().session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    await session.run(
      `
      UNWIND $positions AS pos
      MATCH (n:GraphNode {id: pos.id})
      SET n.posX = pos.posX, n.posY = pos.posY, n.updatedAt = $updatedAt
      `,
      {
        positions,
        updatedAt: new Date().toISOString(),
      }
    );
  } finally {
    await session.close();
  }
}

export async function createGraphEdge(input: {
  sourceNodeId: string;
  targetNodeId: string;
  relationship: string;
  edgeType?: string;
  animated?: boolean;
  lineStyle?: string;
  thickness?: number;
}): Promise<StoredEdge> {
  const sanitizedRelationship = sanitizeRelationship(input.relationship);
  if (!sanitizedRelationship) {
    throw new Error('Invalid relationship label');
  }

  const session = getNeo4jDriver().session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    const duplicateCheck = await session.run(
      `
      MATCH (:GraphNode {id: $sourceNodeId})-[r:RELATES_TO {relationship: $relationship, targetNodeId: $targetNodeId}]->(:GraphNode)
      RETURN r LIMIT 1
      `,
      {
        sourceNodeId: input.sourceNodeId,
        targetNodeId: input.targetNodeId,
        relationship: sanitizedRelationship,
      }
    );

    if (duplicateCheck.records.length > 0) {
      throw new Error('This edge already exists');
    }

    const result = await session.run(
      `
      MATCH (source:GraphNode {id: $sourceNodeId})
      MATCH (target:GraphNode {id: $targetNodeId})
      CREATE (source)-[r:RELATES_TO {
        id: $id,
        sourceNodeId: $sourceNodeId,
        targetNodeId: $targetNodeId,
        relationship: $relationship,
        edgeType: $edgeType,
        animated: $animated,
        lineStyle: $lineStyle,
        thickness: $thickness,
        createdAt: $createdAt
      }]->(target)
      RETURN r
      `,
      {
        id: randomUUID(),
        sourceNodeId: input.sourceNodeId,
        targetNodeId: input.targetNodeId,
        relationship: sanitizedRelationship,
        edgeType: input.edgeType || 'smoothstep',
        animated: input.animated ?? true,
        lineStyle: input.lineStyle || 'dashed',
        thickness: input.thickness ?? 2,
        createdAt: new Date().toISOString(),
      }
    );

    if (result.records.length === 0) {
      throw new Error('Source or target node not found');
    }

    return mapRelationship(result.records[0].get('r'));
  } finally {
    await session.close();
  }
}

export async function updateGraphEdge(input: {
  id: string;
  relationship?: string;
  edgeType?: string;
  animated?: boolean;
  lineStyle?: string;
  thickness?: number;
}): Promise<StoredEdge | null> {
  const session = getNeo4jDriver().session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    const relationship = input.relationship !== undefined ? sanitizeRelationship(input.relationship) : null;
    if (input.relationship !== undefined && !relationship) {
      throw new Error('Invalid relationship label');
    }

    const result = await session.run(
      `
      MATCH ()-[r:RELATES_TO {id: $id}]->()
      SET
        r.relationship = coalesce($relationship, r.relationship),
        r.edgeType = coalesce($edgeType, r.edgeType),
        r.animated = coalesce($animated, r.animated),
        r.lineStyle = coalesce($lineStyle, r.lineStyle),
        r.thickness = coalesce($thickness, r.thickness)
      RETURN r
      `,
      {
        id: input.id,
        relationship,
        edgeType: input.edgeType ?? null,
        animated: input.animated ?? null,
        lineStyle: input.lineStyle ?? null,
        thickness: input.thickness ?? null,
      }
    );

    if (result.records.length === 0) return null;
    return mapRelationship(result.records[0].get('r'));
  } finally {
    await session.close();
  }
}

export async function deleteGraphEdge(id: string): Promise<boolean> {
  const session = getNeo4jDriver().session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    const result = await session.run(
      `
      MATCH ()-[r:RELATES_TO {id: $id}]->()
      WITH count(r) AS deleted, collect(r) AS rels
      FOREACH (rel IN rels | DELETE rel)
      RETURN deleted
      `,
      { id }
    );
    return toNumber(result.records[0]?.get('deleted')) > 0;
  } finally {
    await session.close();
  }
}

export async function clearGraphStore(): Promise<void> {
  const session = getNeo4jDriver().session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    await session.run('MATCH (n:GraphNode) DETACH DELETE n');
  } finally {
    await session.close();
  }
}

export async function importGraphStore(data: {
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
}): Promise<GraphImportResponse> {
  await clearGraphStore();
  const createdIds: string[] = [];

  for (const node of data.nodes) {
    const created = await createGraphNode({
      label: node.label,
      imageUrl: node.imageUrl ?? null,
      emoji: node.emoji ?? null,
      color: node.color ?? '#0d9488',
      posX: node.position?.x,
      posY: node.position?.y,
    });
    createdIds.push(created.id);
  }

  for (const edge of data.edges) {
    const sourceNodeId = createdIds[Number(edge.source)] || edge.source;
    const targetNodeId = createdIds[Number(edge.target)] || edge.target;
    await createGraphEdge({
      sourceNodeId,
      targetNodeId,
      relationship: edge.label || 'related to',
    });
  }

  const graph = await fetchGraphResponse();
  return {
    success: true,
    message: 'Graph imported successfully',
    ...graph,
  };
}

export function validateGeneratedCypher(cypher: string): string {
  const trimmed = cypher.trim();
  if (!trimmed) {
    throw new Error('Model did not return any Cypher.');
  }

  const forbidden = ['DELETE', 'DETACH DELETE', 'DROP', 'REMOVE', 'CALL DBMS', 'LOAD CSV', 'APOC'];
  const upper = trimmed.toUpperCase();
  if (forbidden.some((keyword) => upper.includes(keyword))) {
    throw new Error('Generated Cypher included a forbidden operation.');
  }

  const allowedStarts = ['CREATE', 'MERGE', 'MATCH', 'WITH', 'UNWIND', 'OPTIONAL MATCH', 'SET', 'RETURN'];
  if (!allowedStarts.some((keyword) => upper.startsWith(keyword))) {
    throw new Error('Generated Cypher did not start with an allowed clause.');
  }

  if (!upper.includes('GRAPHNODE') && !upper.includes('RELATES_TO')) {
    throw new Error('Generated Cypher does not target the graph schema.');
  }

  return trimmed;
}

export async function executeGeneratedCypher(cypher: string): Promise<void> {
  const validated = validateGeneratedCypher(cypher);
  const session = getNeo4jDriver().session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    await ensureConstraints();
    await session.run(validated);
  } finally {
    await session.close();
  }
}

export async function runNlpCypher(cypher: string): Promise<GraphNlpResponse> {
  await executeGeneratedCypher(cypher);
  const graph = await fetchGraphResponse();
  return {
    success: true,
    message: 'Cypher applied successfully',
    cypher,
    ...graph,
  };
}

export async function getGraphStats(): Promise<GraphStatsResponse> {
  const { nodes, edges } = await fetchStoredGraph();
  const counts = new Map<string, number>();

  for (const edge of edges) {
    counts.set(edge.sourceNodeId, (counts.get(edge.sourceNodeId) || 0) + 1);
    counts.set(edge.targetNodeId, (counts.get(edge.targetNodeId) || 0) + 1);
  }

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    nodesWithImages: nodes.filter((node) => !!node.imageUrl).length,
    uniqueRelationships: [...new Set(edges.map((edge) => edge.relationship))],
    averageConnections: nodes.length ? (edges.length * 2) / nodes.length : 0,
    topConnected: [...nodes]
      .map((node) => ({
        id: node.id,
        label: node.label,
        connections: counts.get(node.id) || 0,
      }))
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 5),
  };
}
