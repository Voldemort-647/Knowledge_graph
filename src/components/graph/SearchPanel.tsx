'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface SearchPanelProps {
  nodes: Array<{ id: string; label: string; color: string }>;
  onNodeSelect: (nodeId: string) => void;
  onNodeHighlight: (nodeId: string | null) => void;
}

export default function SearchPanel({
  nodes,
  onNodeSelect,
  onNodeHighlight,
}: SearchPanelProps) {
  const [search, setSearch] = useState('');

  const filteredNodes = useMemo(() => {
    if (!search.trim()) return nodes;
    const query = search.toLowerCase();
    return nodes.filter((n) => n.label.toLowerCase().includes(query));
  }, [nodes, search]);

  const handleSelect = useCallback(
    (nodeId: string) => {
      onNodeSelect(nodeId);
    },
    [onNodeSelect]
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="absolute left-4 top-16 z-20 w-72 max-h-[calc(100%-5rem)] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-xl border border-gray-200/80 dark:border-neutral-700/50 shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="h-8 pl-8 pr-8 text-sm border-gray-200 dark:border-neutral-700 focus:border-teal-400 focus:ring-teal-400/20 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)] transition-shadow duration-200"
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="size-3.5 text-gray-400" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5 px-1 flex items-center gap-1.5">
          {search && search.trim() && (
            <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-[10px] font-bold">
              {filteredNodes.length}
            </span>
          )}
          <span>{filteredNodes.length} {filteredNodes.length === 1 ? 'node' : 'nodes'} found</span>
        </p>
      </div>

      {/* Node List */}
      <ScrollArea className="flex-1 max-h-80">
        <div className="p-1.5">
          <AnimatePresence mode="popLayout">
            {filteredNodes.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-10 text-center"
              >
                <div className="size-10 rounded-full bg-gray-100 dark:bg-neutral-800 mx-auto mb-3 flex items-center justify-center">
                  <Search className="size-5 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-400 dark:text-gray-500">No nodes found</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Try a different search term</p>
              </motion.div>
            ) : (
              filteredNodes.map((node, index) => (
                <motion.button
                  key={node.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.1, delay: index * 0.02 }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-teal-50/80 dark:hover:bg-teal-900/20 transition-all duration-150 group text-left"
                  onClick={() => handleSelect(node.id)}
                  onMouseEnter={() => onNodeHighlight(node.id)}
                  onMouseLeave={() => onNodeHighlight(null)}
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white dark:ring-neutral-700 shadow-sm"
                    style={{ backgroundColor: node.color }}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 truncate group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                    {node.label}
                  </span>
                  <ChevronRight className="size-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </motion.button>
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </motion.div>
  );
}
