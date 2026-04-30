'use client';

import { motion } from 'framer-motion';
import { StickyNote } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

interface AddAnnotationButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function AddAnnotationButton({ onClick, disabled }: AddAnnotationButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 rounded-lg backdrop-blur-md border shadow-md transition-all duration-200 bg-white/70 dark:bg-neutral-900/70 border-gray-200/60 dark:border-neutral-700/50 text-gray-600 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-neutral-800/90 hover:border-teal-300 dark:hover:border-teal-700 hover:text-teal-700 dark:hover:text-teal-400 hover:scale-105"
              onClick={onClick}
              disabled={disabled}
            >
              <StickyNote className="size-4" />
            </Button>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="left">Add Annotation</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
