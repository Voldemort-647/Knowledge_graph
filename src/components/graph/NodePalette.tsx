'use client';

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Building2,
  Cpu,
  Lightbulb,
  MapPin,
  Palette,
  ChevronLeft,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/* ─── Node type templates ─── */
export interface NodeTemplate {
  type: string;
  label: string;
  icon: typeof User;
  color: string;
  description: string;
}

export const NODE_TEMPLATES: NodeTemplate[] = [
  {
    type: 'person',
    label: 'Person',
    icon: User,
    color: '#0d9488',
    description: 'Individuals, people, characters',
  },
  {
    type: 'organization',
    label: 'Organization',
    icon: Building2,
    color: '#d97706',
    description: 'Companies, institutions, groups',
  },
  {
    type: 'technology',
    label: 'Technology',
    icon: Cpu,
    color: '#dc2626',
    description: 'Tools, frameworks, platforms',
  },
  {
    type: 'concept',
    label: 'Concept',
    icon: Lightbulb,
    color: '#7c3aed',
    description: 'Ideas, theories, abstractions',
  },
  {
    type: 'location',
    label: 'Location',
    icon: MapPin,
    color: '#059669',
    description: 'Places, cities, countries',
  },
  {
    type: 'custom',
    label: 'Custom',
    icon: Palette,
    color: '#ea580c',
    description: 'Any custom node type',
  },
];

interface NodePaletteProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function NodePalette({ isOpen, onToggle }: NodePaletteProps) {
  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>, template: NodeTemplate) => {
      event.dataTransfer.setData(
        'application/json',
        JSON.stringify({
          type: template.type,
          label: `New ${template.label}`,
          color: template.color,
        })
      );
      event.dataTransfer.effectAllowed = 'move';
      document.body.classList.add('node-palette-dragging');
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    document.body.classList.remove('node-palette-dragging');
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="absolute left-4 top-4 z-20 w-52"
        >
          <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-xl border border-gray-200/60 dark:border-neutral-700/50 shadow-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <GripVertical className="size-3.5 text-gray-400 dark:text-gray-500" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Node Palette
                </span>
              </div>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      onClick={onToggle}
                    >
                      <ChevronLeft className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Close palette</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Template cards */}
            <ScrollArea className="max-h-[calc(100vh-12rem)]">
              <div className="p-2 flex flex-col gap-1.5">
                {NODE_TEMPLATES.map((template, index) => {
                  const Icon = template.icon;
                  return (
                    <motion.div
                      key={template.type}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                    >
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, template)}
                        onDragEnd={handleDragEnd}
                        className="group relative flex items-center gap-3 p-2.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-gray-50/80 dark:hover:bg-neutral-800/60 transition-all duration-200 hover:shadow-sm hover:-translate-y-px select-none"
                      >
                        {/* Color accent bar */}
                        <div
                          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                          style={{ backgroundColor: template.color }}
                        />

                        {/* Icon */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                          style={{
                            backgroundColor: `${template.color}15`,
                            border: `1px solid ${template.color}25`,
                          }}
                        >
                          <Icon
                            className="size-4"
                            style={{ color: template.color }}
                          />
                        </div>

                        {/* Label & description */}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {template.label}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                            {template.description}
                          </p>
                        </div>

                        {/* Drag indicator */}
                        <div className="opacity-0 group-hover:opacity-40 transition-opacity flex-shrink-0">
                          <GripVertical className="size-3 text-gray-400" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Footer hint */}
            <div className="px-3 py-2 border-t border-gray-100 dark:border-neutral-800">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
                Drag onto canvas to create
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
