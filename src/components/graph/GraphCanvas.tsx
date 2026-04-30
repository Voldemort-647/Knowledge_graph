'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
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
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import type { GraphData } from '@/services/api';
import { updateNodePositions } from '@/services/api';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

/* ─── Types ─── */
export interface CustomNodeData {
  label: string;
  imageUrl?: string | null;
  color?: string;
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
}

/* ─── Color helpers ─── */
const TEAL = '#0d9488';

/* ─── Custom Node Component ─── */
function CustomNodeComponent({ data, selected }: NodeProps<CustomNodeType>) {
  const nodeColor = data.color || TEAL;
  const hasImage = data.imageUrl && data.imageUrl.trim().length > 0;

  return (
    <div
      className={`
        group relative flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-md
        transition-all duration-200 cursor-grab active:cursor-grabbing
        hover:shadow-lg hover:scale-[1.02]
        ${selected ? 'ring-2 ring-teal-500 ring-offset-2 shadow-lg' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-teal-400 !border-teal-600"
      />

      {/* Color indicator dot */}
      <div
        className="w-3.5 h-3.5 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
        style={{ backgroundColor: nodeColor }}
      />

      {/* Label */}
      <span className="font-semibold text-sm text-gray-800 max-w-[180px] truncate">
        {data.label}
      </span>

      {/* Optional image thumbnail */}
      {hasImage && (
        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-gray-200">
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

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-teal-400 !border-teal-600"
      />
    </div>
  );
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
}: GraphCanvasProps) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rfRef = useRef<HTMLDivElement>(null);

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

  // Node context menu delete
  const handleNodeContextMenu: NodeMouseHandler = useCallback(
    (_event, node) => {
      // The context menu handles the action via ContextMenuItem
    },
    []
  );

  // Edge context menu — we handle this at the ReactFlow level
  const onEdgeContextMenu = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      // Context menu will handle this
    },
    []
  );

  // Keyboard delete handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only delete if not focused on an input/textarea
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }
        // Find selected nodes and edges via React Flow's selection
        // We rely on the parent to track selected nodes
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div ref={rfRef} className="w-full h-full">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="w-full h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              nodeTypes={nodeTypes}
              onNodeContextMenu={handleNodeContextMenu}
              onEdgeContextMenu={onEdgeContextMenu}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.2}
              maxZoom={2}
              defaultEdgeOptions={{
                type: 'smoothstep',
                animated: true,
                style: { stroke: TEAL, strokeWidth: 2 },
                labelStyle: { fill: TEAL, fontSize: 12, fontWeight: 600 },
                labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
                labelBgPadding: [8, 4] as [number, number],
                labelBgBorderRadius: 4,
              }}
              proOptions={{ hideAttribution: true }}
              className="bg-gray-50/50"
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1.2}
                color="#d1d5db"
              />
              <Controls
                className="!bg-white !border-gray-200 !shadow-md !rounded-lg [&>button]:!border-gray-200 [&>button]:!rounded-md [&>button]:!w-8 [&>button]:!h-8"
                showInteractive={false}
              />
              <MiniMap
                className="!bg-white !border-gray-200 !shadow-md !rounded-lg"
                nodeColor={(node) => {
                  const data = node.data as CustomNodeData;
                  return data?.color || TEAL;
                }}
                maskColor="rgba(0,0,0,0.08)"
                pannable
                zoomable
              />
            </ReactFlow>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            className="gap-2"
            onSelect={() => {
              // Find the selected node from the DOM context
              const selectedNode = nodes.find((n) => n.selected);
              if (selectedNode && onDeleteNode) {
                onDeleteNode(selectedNode.id);
                toast.success(`Node "${selectedNode.data.label}" deleted`);
              } else {
                toast.info('Select a node first to delete it');
              }
            }}
          >
            <Trash2 className="size-4" />
            Delete Selected Node
          </ContextMenuItem>
          <ContextMenuItem
            variant="destructive"
            className="gap-2"
            onSelect={() => {
              const selectedEdge = edges.find((e) => e.selected);
              if (selectedEdge && onDeleteEdge) {
                onDeleteEdge(selectedEdge.id);
                toast.success('Edge deleted');
              } else {
                toast.info('Select an edge first to delete it');
              }
            }}
          >
            <Trash2 className="size-4" />
            Delete Selected Edge
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
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
