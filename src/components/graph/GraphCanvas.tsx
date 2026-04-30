'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type NodeProps,
  type Edge,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Pencil } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTheme } from 'next-themes';
import type { GraphData } from '@/services/api';
import { updateNodePositions } from '@/services/api';

/* ─── Types ─── */
export interface CustomNodeData {
  label: string;
  imageUrl?: string | null;
  color?: string;
  edgeCount?: number;
  [key: string]: unknown;
}

export type CustomNodeType = Node<CustomNodeData, 'customNode'>;

interface GraphCanvasProps {
  nodes: CustomNodeType[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onDeleteNode?: (id: string) => void;
  onDeleteEdge?: (id: string) => void;
  onConnectNew?: (connection: Connection) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onEdgeContextMenu?: (event: React.MouseEvent, edge: Edge) => void;
}

/* ─── Color helpers ─── */
const TEAL = '#0d9488';

/* ─── Custom Node Component ─── */
function CustomNodeComponent({ data, id, selected }: NodeProps<CustomNodeType>) {
  const nodeColor = data.color || TEAL;
  const hasImage = data.imageUrl && data.imageUrl.trim().length > 0;
  const edgeCount = data.edgeCount ?? 0;
  const isLongLabel = data.label.length > 20;

  // Convert hex to rgba with opacity
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const nodeContent = (
    <div className="group relative kg-node-enter">
      {/* Glow effect behind node — softer, wider spread */}
      <div
        className="absolute -inset-2 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none"
        style={{
          boxShadow: `0 0 32px 8px ${hexToRgba(nodeColor, 0.18)}`,
        }}
      />

      <div
        className={`
          relative flex items-center gap-3 rounded-xl px-4 py-3 shadow-md
          transition-all duration-300 cursor-grab active:cursor-grabbing
          hover:shadow-lg
          bg-white dark:bg-neutral-800/90 dark:border-neutral-700/50
          ${selected
            ? 'ring-[3px] ring-offset-2 ring-offset-white dark:ring-offset-neutral-900 shadow-xl'
            : ''
          }
        `}
        style={{
          borderLeft: `4px solid ${nodeColor}`,
          borderRadius: '12px',
          // Subtle gradient background
          background: `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(249,250,251,0.9) 100%)`,
          ...(selected ? {
            boxShadow: `0 0 0 3px ${hexToRgba(nodeColor, 0.5)}, 0 0 24px 6px ${hexToRgba(nodeColor, 0.12)}`,
          } : {}),
          // @ts-expect-error CSS custom property for ring color
          '--tw-ring-color': selected ? nodeColor : undefined,
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent('node-edit-click', { detail: { nodeId: id } }));
        }}
      >
        {/* Gradient overlay */}
        <div
          className="absolute inset-0 rounded-xl opacity-[0.03] dark:opacity-[0.06] pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${nodeColor}, transparent 60%)`,
          }}
        />

        {/* Left Handle (Target) */}
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2.5 !h-2.5 !border-2 !rounded-full handle-animate"
          style={{
            backgroundColor: nodeColor,
            borderColor: 'white',
            boxShadow: `0 0 0 2px ${hexToRgba(nodeColor, 0.3)}`,
          }}
        />

        {/* Handle label "in" on hover */}
        <div className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="text-[9px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded">
            in
          </span>
        </div>

        {/* Content */}
        <div className="relative flex items-center gap-3 min-w-0">
          {/* Image thumbnail (larger, rounded-full) */}
          {hasImage && (
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-100 dark:ring-neutral-600 shadow-sm">
              <img
                src={data.imageUrl as string}
                alt={data.label}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Label */}
          <span className="font-semibold text-sm text-gray-800 dark:text-gray-100 max-w-[180px] truncate select-none">
            {data.label}
          </span>

          {/* Edge count badge */}
          {edgeCount > 0 && (
            <div
              className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: hexToRgba(nodeColor, 0.7) }}
            >
              {edgeCount}
            </div>
          )}
        </div>

        {/* Edit icon button (appears on hover) */}
        <button
          className="absolute -top-2 -right-2 size-6 rounded-full bg-white dark:bg-neutral-700 shadow-md border border-gray-200 dark:border-neutral-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 hover:bg-teal-50 dark:hover:bg-teal-900/40 hover:border-teal-200 dark:hover:border-teal-700 z-10"
          onClick={(e) => {
            e.stopPropagation();
            const event = new CustomEvent('node-edit-click', { detail: { nodeId: id } });
            window.dispatchEvent(event);
          }}
        >
          <Pencil className="size-3 text-gray-500 dark:text-gray-400 group-hover:text-teal-600 dark:group-hover:text-teal-400" />
        </button>

        {/* Right Handle (Source) */}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-2.5 !h-2.5 !border-2 !rounded-full handle-animate"
          style={{
            backgroundColor: nodeColor,
            borderColor: 'white',
            boxShadow: `0 0 0 2px ${hexToRgba(nodeColor, 0.3)}`,
          }}
        />

        {/* Handle label "out" on hover */}
        <div className="absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="text-[9px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded">
            out
          </span>
        </div>
      </div>
    </div>
  );

  // Wrap with tooltip for long labels
  if (isLongLabel) {
    return (
      <TooltipProvider delayDuration={400}>
        <Tooltip>
          <TooltipTrigger asChild>
            {nodeContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-sm">
            {data.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return nodeContent;
}

/* ─── Main GraphCanvas ─── */
export default function GraphCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onDeleteNode,
  onDeleteEdge,
  onConnectNew,
  onNodeDoubleClick,
  onEdgeContextMenu,
}: GraphCanvasProps) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rfRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Compute edge counts per node
  const edgeCountMap = useMemo(() => {
    const counts: Record<string, number> = {};
    edges.forEach((e) => {
      counts[e.source] = (counts[e.source] || 0) + 1;
      counts[e.target] = (counts[e.target] || 0) + 1;
    });
    return counts;
  }, [edges]);

  // Augment nodes with edge count
  const augmentedNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          edgeCount: edgeCountMap[n.id] || 0,
        },
      })) as CustomNodeType[],
    [nodes, edgeCountMap]
  );

  // Node types — memoized to avoid re-renders
  const nodeTypes = useMemo(
    () => ({
      customNode: CustomNodeComponent,
    }),
    []
  );

  // Save positions with debounce after drag ends
  const debouncedSave = useCallback(
    (changedNodes: CustomNodeType[]) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const positions = changedNodes.map((n) => ({
            id: n.id,
            posX: n.position.x,
            posY: n.position.y,
          }));
          await updateNodePositions(positions);
        } catch {
          // Silently fail for position saves
        }
      }, 400);
    },
    []
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Track node changes and save positions after drag
  const handleNodesChange = useCallback(
    (changes: Parameters<OnNodesChange>[0]) => {
      onNodesChange(changes);

      // Check if there are position changes
      const positionChanges = changes.filter(
        (c) => c.type === 'position' && c.dragging === false
      );
      if (positionChanges.length > 0) {
        const changedNodeIds = new Set(positionChanges.map((c) => c.id));
        const changedNodes = nodes.filter((n) => changedNodeIds.has(n.id));
        if (changedNodes.length > 0) {
          debouncedSave(changedNodes);
        }
      }
    },
    [onNodesChange, nodes, debouncedSave]
  );

  // Handle new connection from handle dragging
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (onConnectNew) {
        onConnectNew(connection);
      }
    },
    [onConnectNew]
  );

  // Handle node double-click
  const handleNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (onNodeDoubleClick) {
        onNodeDoubleClick(node.id);
      }
    },
    [onNodeDoubleClick]
  );

  // Handle edge right-click context menu
  const handleEdgeContextMenu: EdgeMouseHandler = useCallback(
    (event, edge) => {
      event.preventDefault();
      if (onEdgeContextMenu) {
        onEdgeContextMenu(event as unknown as React.MouseEvent, edge);
      }
    },
    [onEdgeContextMenu]
  );

  return (
    <div ref={rfRef} className="w-full h-full">
      <ReactFlow
        nodes={augmentedNodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeDoubleClick={handleNodeDoubleClick}
        onEdgeContextMenu={handleEdgeContextMenu}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        zoomOnDoubleClick={false}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: TEAL, strokeWidth: 2 },
          labelStyle: { fill: TEAL, fontSize: 12, fontWeight: 600 },
          labelBgStyle: { fill: isDark ? '#1c1f26' : '#ffffff', fillOpacity: 0.9 },
          labelBgPadding: [8, 4] as [number, number],
          labelBgBorderRadius: 4,
        }}
        proOptions={{ hideAttribution: true }}
        className={!isDark ? '!bg-gradient-to-br !from-gray-50 !via-stone-50 !to-gray-100 react-flow-canvas-light' : 'react-flow-canvas-dark'}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color={isDark ? '#374151' : '#d1d5db'}
        />
        <Controls
          className={`!shadow-md ${!isDark ? '!bg-white !border-gray-200 [&>button]:!border-gray-200' : '!bg-neutral-800/90 !border-neutral-700/50 [&>button]:!border-neutral-700/50'} [&>button]:!rounded-md [&>button]:!w-8 [&>button]:!h-8`}
          showInteractive={false}
        />
        <MiniMap
          className={`!shadow-md ${!isDark ? '!bg-white !border-gray-200' : '!bg-neutral-800/90 !border-neutral-700/50'}`}
          nodeColor={(node) => {
            const data = node.data as CustomNodeData;
            return data?.color || TEAL;
          }}
          maskColor={isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)'}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}

/* ─── Helper to convert raw API graph data to React Flow format ─── */
export function mapApiToReactFlow(data: GraphData): {
  nodes: CustomNodeType[];
  edges: Edge[];
} {
  return {
    nodes: data.nodes.map((n) => ({
      id: n.id,
      type: 'customNode',
      position: n.position,
      data: {
        label: n.data.label,
        imageUrl: n.data.imageUrl,
        color: n.data.color,
      },
    })) as CustomNodeType[],
    edges: data.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: e.type || 'smoothstep',
      animated: e.animated !== false,
      style: e.style || { stroke: TEAL, strokeWidth: 2 },
      labelStyle: e.labelStyle || {
        fill: TEAL,
        fontSize: 12,
        fontWeight: 600,
      },
      labelBgStyle: e.labelBgStyle || {
        fill: '#ffffff',
        fillOpacity: 0.9,
      },
      labelBgPadding: e.labelBgPadding || ([8, 4] as [number, number]),
      labelBgBorderRadius: e.labelBgBorderRadius || 4,
    })),
  };
}
