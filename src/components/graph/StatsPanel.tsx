'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Network,
  GitBranch,
  Star,
  TrendingUp,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchStats, type GraphStats } from '@/services/api';

interface StatsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function StatsPanel({ isOpen, onToggle }: StatsPanelProps) {
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchStats();
      setStats(data);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, loadStats]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute right-4 top-16 z-20 w-72 max-h-[calc(100%-5rem)] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-xl border border-gray-200/80 dark:border-neutral-700/50 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500">
                <BarChart3 className="size-3.5 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Graph Statistics</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg hover:bg-gray-100"
              onClick={onToggle}
            >
              <ChevronLeft className="size-4 text-gray-400" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : stats ? (
              <>
                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-2">
                  <Card className="rounded-xl border-gray-100 shadow-sm p-3 bg-gradient-to-br from-teal-50 via-teal-50/50 to-white dark:from-teal-900/20 dark:via-teal-900/10 dark:to-neutral-900/60 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Network className="size-3 text-teal-500" />
                      <p className="text-[11px] text-gray-500 font-medium">Nodes</p>
                    </div>
                    <p className="text-xl font-bold text-gray-800 stat-number">{stats.totalNodes}</p>
                  </Card>
                  <Card className="rounded-xl border-gray-100 shadow-sm p-3 bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-white dark:from-emerald-900/20 dark:via-emerald-900/10 dark:to-neutral-900/60 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center gap-1.5 mb-1">
                      <GitBranch className="size-3 text-emerald-500" />
                      <p className="text-[11px] text-gray-500 font-medium">Edges</p>
                    </div>
                    <p className="text-xl font-bold text-gray-800 stat-number">{stats.totalEdges}</p>
                  </Card>
                  <Card className="rounded-xl border-gray-100 shadow-sm p-3 bg-gradient-to-br from-amber-50 via-amber-50/50 to-white dark:from-amber-900/20 dark:via-amber-900/10 dark:to-neutral-900/60 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Star className="size-3 text-amber-500" />
                      <p className="text-[11px] text-gray-500 font-medium">Relationships</p>
                    </div>
                    <p className="text-xl font-bold text-gray-800 stat-number">{stats.uniqueRelationships.length}</p>
                  </Card>
                  <Card className="rounded-xl border-gray-100 shadow-sm p-3 bg-gradient-to-br from-rose-50 via-rose-50/50 to-white dark:from-rose-900/20 dark:via-rose-900/10 dark:to-neutral-900/60 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp className="size-3 text-rose-500" />
                      <p className="text-[11px] text-gray-500 font-medium">Avg Conn.</p>
                    </div>
                    <p className="text-xl font-bold text-gray-800 stat-number">
                      {stats.averageConnections.toFixed(1)}
                    </p>
                  </Card>
                </div>

                <Separator className="my-1" />

                {/* Unique Relationships */}
                {stats.uniqueRelationships.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Relationship Types
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {stats.uniqueRelationships.map((rel) => (
                        <Badge
                          key={rel}
                          variant="secondary"
                          className="text-[10px] bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-100 rounded-full"
                        >
                          {rel.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Connected Nodes */}
                {stats.topConnected.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Top Connected
                    </h4>
                    <div className="space-y-1.5">
                      {stats.topConnected.slice(0, 5).map((node, index) => (
                        <motion.div
                          key={node.id}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-teal-50/60 dark:hover:bg-teal-900/15 transition-colors duration-150"
                        >
                          <span className="text-[10px] text-gray-400 font-mono w-4 text-right font-bold">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                              {node.label}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] rounded-full px-1.5 py-0 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-700/40 bg-teal-50/50 dark:bg-teal-900/15"
                          >
                            {node.connections}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center">
                <BarChart3 className="size-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No statistics available</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
