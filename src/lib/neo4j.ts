import neo4j, { type Driver, type Integer, type Node as Neo4jNode, type Relationship } from 'neo4j-driver';

declare global {
  var __neo4jDriver__: Driver | undefined;
}

function getRequiredEnv(name: 'NEO4J_URI' | 'NEO4J_USERNAME' | 'NEO4J_PASSWORD'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getNeo4jDriver(): Driver {
  if (!global.__neo4jDriver__) {
    global.__neo4jDriver__ = neo4j.driver(
      getRequiredEnv('NEO4J_URI'),
      neo4j.auth.basic(
        getRequiredEnv('NEO4J_USERNAME'),
        getRequiredEnv('NEO4J_PASSWORD')
      )
    );
  }

  return global.__neo4jDriver__;
}

export function toNumber(value: Integer | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : value.toNumber();
}

export interface StoredNode {
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

export interface StoredEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationship: string;
  edgeType: string;
  animated: boolean;
  lineStyle: string;
  thickness: number;
  createdAt: string;
}

export function mapNode(node: Neo4jNode): StoredNode {
  const props = node.properties as Record<string, unknown>;
  return {
    id: String(props.id),
    label: String(props.label ?? ''),
    imageUrl: props.imageUrl ? String(props.imageUrl) : null,
    emoji: props.emoji ? String(props.emoji) : null,
    color: String(props.color ?? '#0d9488'),
    posX: toNumber(props.posX as Integer | number | undefined),
    posY: toNumber(props.posY as Integer | number | undefined),
    createdAt: String(props.createdAt ?? ''),
    updatedAt: String(props.updatedAt ?? ''),
  };
}

export function mapRelationship(rel: Relationship): StoredEdge {
  const props = rel.properties as Record<string, unknown>;
  return {
    id: String(props.id),
    sourceNodeId: String(props.sourceNodeId),
    targetNodeId: String(props.targetNodeId),
    relationship: String(props.relationship ?? ''),
    edgeType: String(props.edgeType ?? 'smoothstep'),
    animated: Boolean(props.animated ?? true),
    lineStyle: String(props.lineStyle ?? 'solid'),
    thickness: toNumber(props.thickness as Integer | number | undefined) || 2,
    createdAt: String(props.createdAt ?? ''),
  };
}
