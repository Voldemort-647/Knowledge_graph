'use client';

import { motion } from 'framer-motion';
import { Trash2, Group, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SelectionInfoBarProps {
  selectedNodeCount: number;
  selectedEdgeCount: number;
  onBatchDelete: () => void;
  onGroupSelection: () => void;
  onDeselectAll: () => void;
}

export default function SelectionInfoBar({
  selectedNodeCount,
  selectedEdgeCount,
  onBatchDelete,
  onGroupSelection,
  onDeselectAll,
}: SelectionInfoBarProps) {
  const totalSelected = selectedNodeCount + selectedEdgeCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
      }}
      className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 z-30"
    >
      <div className="flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-white/85 dark:bg-neutral-900/85 backdrop-blur-xl border border-gray-200/70 dark:border-neutral-700/60 shadow-xl shadow-black/5 dark:shadow-black/30">
        {/* Selection count info */}
        <div className="flex items-center gap-2 px-3 py-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
            <Users className="size-3.5 text-teal-600 dark:text-teal-400" />
            <span>
              {totalSelected} selected
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
            <span className="px-1.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-medium">
              {selectedNodeCount} {selectedNodeCount === 1 ? 'node' : 'nodes'}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400 font-medium">
              {selectedEdgeCount} {selectedEdgeCount === 1 ? 'edge' : 'edges'}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 dark:bg-neutral-700 mx-1" />

        {/* Action buttons */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                  onClick={onBatchDelete}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Delete selected
            </TooltipContent>
          </Tooltip>

          {/* Group button — only if 2+ nodes */}
          {selectedNodeCount >= 2 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-xl text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                    onClick={onGroupSelection}
                  >
                    <Group className="size-3.5" />
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Group selection
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  onClick={onDeselectAll}
                >
                  <X className="size-3.5" />
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Deselect all
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </motion.div>
  );
}
