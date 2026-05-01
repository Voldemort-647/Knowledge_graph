'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
  type OnEdgesChange,
  type OnNodesChange,
  type OnSelectionChangeFunc,
  type ReactFlowInstance,
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphData } from '@/services/api';
import { updateNodePositions } from '@/services/api';

export interface CustomNodeData {
  label: string;
  imageUrl?: string | null;
  emoji?: string | null;
  color?: string;
  edgeCount?: number;
  [key: string]: unknown;
}

export type CustomNodeType = Node<CustomNodeData, 'customNode'>;
export type NodeShape = 'rectangle' | 'circle';
export type GraphSurfaceTheme = 'light' | 'dark';

interface GraphCanvasProps {
  nodes: CustomNodeType[];
  edges: Edge[];
  onNodesChange: OnNodesChange<CustomNodeType>;
  onEdgesChange: OnEdgesChange<Edge>;
  onConnectNew?: (connection: Connection) => void;
  onInit?: (instance: ReactFlowInstance<CustomNodeType, Edge>) => void;
  onSelectionChange?: OnSelectionChangeFunc;
  nodeShape?: NodeShape;
  surfaceTheme?: GraphSurfaceTheme;
}

const TEAL = '#0d9488';
const EDGE_DASH = '8 4';

function BasicNode({
  data,
  selected,
}: NodeProps<Node<CustomNodeData & { shape?: NodeShape }, 'customNode'>>) {
  const color = data.color || TEAL;
  const shape = data.shape || 'rectangle';
  const isCircle = shape === 'circle';
  return (
    <div className={`relative ${isCircle ? 'w-[150px]' : 'min-w-[180px]'}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !bg-white"
        style={{ borderColor: color }}
      />
      <div
        className={`${isCircle ? 'flex h-[150px] w-[150px] flex-col items-center justify-center rounded-full px-5 py-5 text-center' : 'rounded-xl px-4 py-3'} bg-white shadow-lg dark:bg-neutral-900 ${
          selected ? 'ring-2 ring-teal-500 ring-offset-2 dark:ring-offset-neutral-950' : ''
        }`}
        style={{
          border: `4px solid ${color}`,
          boxShadow: selected
            ? `0 0 0 2px rgba(20, 184, 166, 0.25), 0 12px 26px rgba(15, 23, 42, 0.18)`
            : `0 10px 24px rgba(15, 23, 42, 0.14)`,
        }}
      >
        <div className={`flex ${isCircle ? 'flex-col items-center gap-2' : 'items-center gap-3'}`}>
          {data.emoji ? <span className="text-lg">{data.emoji}</span> : null}
          <div className={`min-w-0 ${isCircle ? '' : 'flex-1'}`}>
            <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {data.label}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {data.edgeCount ?? 0} connection{(data.edgeCount ?? 0) === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !bg-white"
        style={{ borderColor: color }}
      />
    </div>
  );
}

export function CustomEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
  label,
  data,
  animated,
}: EdgeProps) {
  const { index = 0, total = 1 } = (data || {}) as { index?: number; total?: number };
  
  const offset = (index - (total - 1) / 2) * 45;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  const nx = distance === 0 ? 0 : -dy / distance;
  const ny = distance === 0 ? 0 : dx / distance;
  
  const centerX = sourceX + dx / 2 + nx * offset;
  const centerY = sourceY + dy / 2 + ny * offset;

  const controlX = 2 * centerX - sourceX / 2 - targetX / 2;
  const controlY = 2 * centerY - sourceY / 2 - targetY / 2;

  const edgePath = `M ${sourceX} ${sourceY} Q ${controlX} ${controlY} ${targetX} ${targetY}`;
  
  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} className={animated ? 'react-flow__edge-path animated' : 'react-flow__edge-path'} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${centerX}px,${centerY}px)`,
              pointerEvents: 'all',
              background: '#ffffff',
              padding: '4px 8px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#0d9488',
              opacity: 0.92,
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default function GraphCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnectNew,
  onInit,
  onSelectionChange,
  nodeShape = 'rectangle',
  surfaceTheme = 'light',
}: GraphCanvasProps) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const edgeCountMap = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const edge of edges) {
      counts[edge.source] = (counts[edge.source] || 0) + 1;
      counts[edge.target] = (counts[edge.target] || 0) + 1;
    }
    return counts;
  }, [edges]);

  const graphNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          edgeCount: edgeCountMap[node.id] || 0,
          shape: nodeShape,
        },
      })) as CustomNodeType[],
    [nodes, edgeCountMap, nodeShape]
  );

  const nodeTypes = useMemo(() => ({ customNode: BasicNode }), []);
  const edgeTypes = useMemo(() => ({ customEdge: CustomEdge }), []);

  const persistPositions = useCallback((positions: Array<{ id: string; posX: number; posY: number }>) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await updateNodePositions(positions).catch(() => undefined);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleNodesChange: OnNodesChange<CustomNodeType> = useCallback(
    (changes) => {
      onNodesChange(changes);
      const movedNodes: Array<{ id: string; posX: number; posY: number }> = [];
      for (const change of changes) {
        if (change.type === 'position' && change.dragging === false) {
          movedNodes.push({
            id: change.id,
            posX: change.position?.x ?? 0,
            posY: change.position?.y ?? 0,
          });
        }
      }

      if (movedNodes.length > 0) {
        persistPositions(movedNodes);
      }
    },
    [onNodesChange, persistPositions]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      onConnectNew?.(connection);
    },
    [onConnectNew]
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, _node) => undefined,
    []
  );

  return (
    <div className={`h-full w-full rounded-2xl border shadow-xl ${surfaceTheme === 'dark' ? 'border-neutral-800 bg-neutral-950' : 'border-slate-200 bg-white'}`}>
      <ReactFlow
        nodes={graphNodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onInit={onInit}
        onNodeClick={handleNodeClick}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={0.25}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: TEAL, strokeWidth: 2, strokeDasharray: EDGE_DASH },
          labelStyle: { fill: TEAL, fontSize: 12, fontWeight: 600 },
          labelBgStyle: { fill: '#ffffff', fillOpacity: 0.92 },
          labelBgPadding: [8, 4],
          labelBgBorderRadius: 999,
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color={surfaceTheme === 'dark' ? '#334155' : '#cbd5e1'}
          bgColor={surfaceTheme === 'dark' ? '#0a0f1a' : '#ffffff'}
        />
        <MiniMap
          pannable
          zoomable
          maskColor={surfaceTheme === 'dark' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(15, 23, 42, 0.08)'}
          nodeColor={(node) => (node.data as CustomNodeData).color || TEAL}
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export function mapApiToReactFlow(data: GraphData): { nodes: CustomNodeType[]; edges: Edge[] } {
  const edgeGroups: Record<string, number> = {};
  data.edges.forEach((e) => {
    const key = [e.source, e.target].sort().join('-');
    edgeGroups[key] = (edgeGroups[key] || 0) + 1;
  });

  const edgeCounters: Record<string, number> = {};

  return {
    nodes: data.nodes.map((node) => ({
      id: node.id,
      type: 'customNode',
      position: node.position,
      data: {
        label: node.data.label,
        imageUrl: node.data.imageUrl,
        emoji: node.data.emoji,
        color: node.data.color || TEAL,
      },
    })) as CustomNodeType[],
    edges: data.edges.map((edge) => {
      const key = [edge.source, edge.target].sort().join('-');
      const total = edgeGroups[key];
      const index = edgeCounters[key] || 0;
      edgeCounters[key] = index + 1;

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: total > 1 ? 'customEdge' : (edge.type || 'smoothstep'),
        animated: edge.animated !== false,
        data: { index, total },
        style: edge.style || { stroke: TEAL, strokeWidth: 2, strokeDasharray: EDGE_DASH },
        labelStyle: edge.labelStyle || { fill: TEAL, fontSize: 12, fontWeight: 600 },
        labelBgStyle: edge.labelBgStyle || { fill: '#ffffff', fillOpacity: 0.92 },
        labelBgPadding: edge.labelBgPadding || [8, 4],
        labelBgBorderRadius: edge.labelBgBorderRadius || 999,
      };
    }),
  };
}
