'use client';

import { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2, Crosshair, ArrowRightLeft, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { CustomNodeType } from '@/components/graph/GraphCanvas';
import type { Edge } from '@xyflow/react';

interface NodeInspectorProps {
  node: CustomNodeType;
  edges: Edge[];
  allNodes: CustomNodeType[];
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onFocus: (nodeId: string) => void;
}

function NodeInspectorInner({
  node,
  edges,
  allNodes,
  onEdit,
  onDelete,
  onFocus,
}: NodeInspectorProps) {
  const nodeColor = node.data.color || '#0d9488';
  const hasImage = node.data.imageUrl && node.data.imageUrl.trim().length > 0;

  // Find connected edges
  const connectedEdges = useMemo(() => {
    return edges.filter((e) => e.source === node.id || e.target === node.id);
  }, [edges, node.id]);

  // Get connected node labels
  const getNodeLabel = (id: string) => {
    const found = allNodes.find((n) => n.id === id);
    return found?.data.label || id;
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-lg"
    >
      <div className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl border border-gray-200/60 dark:border-neutral-700/60 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/30 overflow-hidden">
        {/* Top accent line */}
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, ${nodeColor}, transparent)` }}
        />

        <div className="px-5 py-4">
          {/* Header row */}
          <div className="flex items-start gap-4">
            {/* Node color indicator + image or icon */}
            <div className="flex-shrink-0">
              {hasImage ? (
                <div
                  className="w-12 h-12 rounded-xl overflow-hidden shadow-md ring-2 ring-offset-2 ring-offset-white dark:ring-offset-neutral-800"
                  style={{ ringColor: nodeColor, '--tw-ring-color': nodeColor } as React.CSSProperties}
                >
                  <img
                    src={node.data.imageUrl!}
                    alt={node.data.label}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md"
                  style={{ backgroundColor: nodeColor }}
                >
                  {node.data.label.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 truncate">
                {node.data.label}
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <span
                  className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: nodeColor }}
                  />
                  {nodeColor}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {connectedEdges.length} {connectedEdges.length === 1 ? 'connection' : 'connections'}
                </span>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:bg-teal-50 dark:hover:bg-teal-900/30 text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400"
                onClick={() => onEdit(node.id)}
                title="Edit node"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:bg-teal-50 dark:hover:bg-teal-900/30 text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400"
                onClick={() => onFocus(node.id)}
                title="Focus on node"
              >
                <Crosshair className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                onClick={() => onDelete(node.id)}
                title="Delete node"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Connected edges list */}
          {connectedEdges.length > 0 && (
            <>
              <Separator className="my-3 bg-gray-100 dark:bg-neutral-700/60" />
              <div className="space-y-1.5 max-h-24 overflow-y-auto">
                {connectedEdges.map((edge) => {
                  const isSource = edge.source === node.id;
                  const otherNodeLabel = getNodeLabel(isSource ? edge.target : edge.source);
                  return (
                    <div
                      key={edge.id}
                      className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 py-0.5"
                    >
                      <ArrowRightLeft className="size-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      <span className="truncate">
                        {isSource ? '→' : '←'}{' '}
                        <span className="font-medium">{otherNodeLabel}</span>
                        {edge.label && (
                          <span className="text-gray-400 dark:text-gray-500 ml-1">
                            ({edge.label})
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const NodeInspectorInnerMemo = memo(NodeInspectorInner);

interface NodeInspectorContainerProps {
  selectedNodes: CustomNodeType[];
  edges: Edge[];
  allNodes: CustomNodeType[];
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onFocus: (nodeId: string) => void;
}

export default function NodeInspector({
  selectedNodes,
  edges,
  allNodes,
  onEdit,
  onDelete,
  onFocus,
}: NodeInspectorContainerProps) {
  return (
    <AnimatePresence>
      {selectedNodes.length === 1 && (
        <NodeInspectorInnerMemo
          node={selectedNodes[0]}
          edges={edges}
          allNodes={allNodes}
          onEdit={onEdit}
          onDelete={onDelete}
          onFocus={onFocus}
        />
      )}
    </AnimatePresence>
  );
}
