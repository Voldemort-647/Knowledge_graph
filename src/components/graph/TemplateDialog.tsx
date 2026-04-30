'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GRAPH_TEMPLATES, type GraphTemplate } from '@/lib/templates';
import { importGraph } from '@/services/api';

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGraphUpdated: () => void;
}

export default function TemplateDialog({ open, onOpenChange, onGraphUpdated }: TemplateDialogProps) {
  const handleLoadTemplate = useCallback(
    async (template: GraphTemplate) => {
      try {
        const result = await importGraph({
          nodes: template.nodes.map((n) => ({
            label: n.label,
            color: n.color,
            position: n.position,
          })),
          edges: template.edges.map((e) => ({
            source: e.source,
            target: e.target,
            label: e.label,
          })),
        });
        toast.success(result.message || `Template "${template.name}" loaded!`);
        onGraphUpdated();
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load template');
      }
    },
    [onGraphUpdated, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-bold">Graph Templates</DialogTitle>
          <DialogDescription>
            Choose a pre-built template to quickly get started with a sample graph.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-6 pb-6">
            {GRAPH_TEMPLATES.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.25 }}
                className="group relative rounded-xl border border-gray-200/60 dark:border-neutral-700/50 bg-white dark:bg-neutral-900/60 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Gradient accent bar at top */}
                <div
                  className="h-1 w-full"
                  style={{
                    background: `linear-gradient(90deg, ${template.accentColor}, ${template.accentColor}80)`,
                  }}
                />

                <div className="p-4">
                  {/* Header: icon + name */}
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {template.name}
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                  </div>

                  {/* Stats badges */}
                  <div className="flex items-center gap-2 mb-3">
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-2 py-0 h-5 font-medium"
                      style={{
                        backgroundColor: `${template.accentColor}12`,
                        color: template.accentColor,
                        borderColor: `${template.accentColor}25`,
                        border: '1px solid',
                      }}
                    >
                      {template.nodes.length} nodes
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-2 py-0 h-5 font-medium"
                      style={{
                        backgroundColor: `${template.accentColor}12`,
                        color: template.accentColor,
                        borderColor: `${template.accentColor}25`,
                        border: '1px solid',
                      }}
                    >
                      {template.edges.length} edges
                    </Badge>
                  </div>

                  {/* Mini graph preview */}
                  <div className="bg-gray-50 dark:bg-neutral-800/40 rounded-lg p-3 mb-3 relative overflow-hidden">
                    <svg viewBox="0 0 200 80" className="w-full h-auto">
                      {/* Render mini nodes and edges */}
                      {template.edges.map((edge, ei) => {
                        const source = template.nodes.findIndex((n) => n.label === edge.source);
                        const target = template.nodes.findIndex((n) => n.label === edge.target);
                        if (source < 0 || target < 0) return null;
                        const sx = 20 + (source % 3) * 70;
                        const sy = 15 + Math.floor(source / 3) * 50;
                        const tx = 20 + (target % 3) * 70;
                        const ty = 15 + Math.floor(target / 3) * 50;
                        return (
                          <line
                            key={`e-${ei}`}
                            x1={sx}
                            y1={sy}
                            x2={tx}
                            y2={ty}
                            stroke={template.accentColor}
                            strokeWidth="1"
                            strokeOpacity="0.3"
                            strokeDasharray="3 2"
                          />
                        );
                      })}
                      {template.nodes.map((node, ni) => {
                        const cx = 20 + (ni % 3) * 70;
                        const cy = 15 + Math.floor(ni / 3) * 50;
                        return (
                          <g key={`n-${ni}`}>
                            <circle
                              cx={cx}
                              cy={cy}
                              r="6"
                              fill={node.color}
                              opacity="0.8"
                            />
                            <text
                              x={cx}
                              y={cy + 14}
                              textAnchor="middle"
                              fill="currentColor"
                              className="text-gray-500 dark:text-gray-400"
                              fontSize="5"
                              fontWeight="500"
                            >
                              {node.label.length > 8 ? node.label.slice(0, 8) : node.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Load button */}
                  <Button
                    size="sm"
                    className="w-full text-xs font-medium text-white transition-all duration-200 hover:shadow-md"
                    style={{
                      background: `linear-gradient(135deg, ${template.accentColor}, ${template.accentColor}cc)`,
                    }}
                    onClick={() => handleLoadTemplate(template)}
                  >
                    Load Template
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
