'use client';

import { useActivityStore, ACTIVITY_COLORS, formatRelativeTime } from '@/store/activity-store';
import { ScrollText, X, Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityLogProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function ActivityLog({ isOpen, onToggle }: ActivityLogProps) {
  const { entries, clearEntries } = useActivityStore();

  return (
    <>
      {/* Toggle button */}
      <motion.div
        className="absolute bottom-16 right-4 z-20"
        initial={false}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          size="icon"
          variant="outline"
          className={`h-9 w-9 rounded-lg backdrop-blur-md border shadow-md transition-all duration-200 ${
            isOpen
              ? 'bg-teal-50/80 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700/60 text-teal-700 dark:text-teal-400'
              : 'bg-white/70 dark:bg-neutral-900/70 border-gray-200/60 dark:border-neutral-700/50 text-gray-600 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-neutral-800/90'
          }`}
          onClick={onToggle}
        >
          <ScrollText className="size-4" />
        </Button>
      </motion.div>

      {/* Activity Log Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-28 right-4 z-20 w-80 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/80 dark:border-neutral-700/60 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-neutral-700/50">
              <div className="flex items-center gap-2">
                <ScrollText className="size-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Activity Log
                </h3>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-neutral-700/50 px-1.5 py-0.5 rounded-full tabular-nums">
                  {entries.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {entries.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1.5 text-[10px] text-gray-400 hover:text-red-500"
                    onClick={clearEntries}
                  >
                    <Eraser className="size-3" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={onToggle}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Entries list */}
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {entries.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <ScrollText className="size-6 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    No activity yet
                  </p>
                  <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">
                    Changes will appear here
                  </p>
                </div>
              ) : (
                <div className="py-1">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50/50 dark:hover:bg-neutral-700/20 transition-colors duration-150 group"
                    >
                      {/* Colored dot */}
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 transition-transform group-hover:scale-125"
                        style={{ backgroundColor: ACTIVITY_COLORS[entry.type] }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed truncate">
                          {entry.description}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums mt-0.5">
                          {formatRelativeTime(entry.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
