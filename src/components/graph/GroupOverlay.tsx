'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useGroupStore, type NodeGroup } from '@/store/group-store';
import { hexToRgba } from '@/lib/groups';
import type { Node } from '@xyflow/react';

interface CustomNodeData {
  label: string;
  imageUrl?: string | null;
  color?: string;
  edgeCount?: number;
  [key: string]: unknown;
}

interface GroupOverlayProps {
  nodes: Node<CustomNodeData>[];
}

const GROUP_PADDING = 40;

export default function GroupOverlay({ nodes }: GroupOverlayProps) {
  const { groups, removeGroup } = useGroupStore();

  // Compute bounding boxes for each group
  const groupBounds = useMemo(() => {
    const result: Array<{
      group: NodeGroup;
      x: number;
      y: number;
      width: number;
      height: number;
    }> = [];

    for (const group of Object.values(groups)) {
      const groupNodes = nodes.filter((n) => group.nodeIds.includes(n.id));
      if (groupNodes.length === 0) continue;

      // Calculate bounding box
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const node of groupNodes) {
        const nodeWidth = 220; // approximate node width
        const nodeHeight = 80; // approximate node height
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + nodeWidth);
        maxY = Math.max(maxY, node.position.y + nodeHeight);
      }

      result.push({
        group,
        x: minX - GROUP_PADDING,
        y: minY - GROUP_PADDING - 28, // Extra space for label
        width: maxX - minX + GROUP_PADDING * 2,
        height: maxY - minY + GROUP_PADDING * 2 + 28,
      });
    }

    return result;
  }, [groups, nodes]);

  return (
    <AnimatePresence>
      {groupBounds.map(({ group, x, y, width, height }) => (
        <motion.div
          key={group.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="absolute pointer-events-none"
          style={{
            left: x,
            top: y,
            width,
            height,
          }}
        >
          {/* Group rectangle */}
          <div
            className="w-full h-full rounded-2xl transition-all duration-300"
            style={{
              backgroundColor: hexToRgba(group.color, 0.06),
              border: `2px dashed ${hexToRgba(group.color, 0.4)}`,
              boxShadow: `inset 0 0 20px ${hexToRgba(group.color, 0.04)}`,
            }}
          >
            {/* Group label bar */}
            <div className="flex items-center gap-1.5 px-3 pt-2 pointer-events-auto">
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-sm"
                style={{
                  backgroundColor: hexToRgba(group.color, 0.12),
                  color: group.color,
                  border: `1px solid ${hexToRgba(group.color, 0.25)}`,
                }}
              >
                {group.label}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                ({group.nodeIds.length})
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeGroup(group.id);
                }}
                className="ml-1 w-5 h-5 flex items-center justify-center rounded-md bg-white/60 dark:bg-neutral-800/60 border border-gray-200 dark:border-neutral-700 text-gray-400 hover:text-red-500 hover:border-red-300 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-150"
              >
                <X className="size-3" />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
