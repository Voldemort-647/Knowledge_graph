'use client';

import { useState, useCallback, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  children: ReactNode;
  onDropNode?: (data: { type: string; label: string; color: string; position: { x: number; y: number } }) => void;
  screenToFlowPosition: ((screenPos: { x: number; y: number }) => { x: number; y: number }) | null;
}

export default function DropZone({ children, onDropNode, screenToFlowPosition }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    // Only show indicator if dragging from palette
    if (event.dataTransfer.types.includes('application/json')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    // Only hide indicator if actually leaving the container
    if (dropRef.current && !dropRef.current.contains(event.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragOver(false);

      if (!screenToFlowPosition || !onDropNode) return;

      try {
        const rawData = event.dataTransfer.getData('application/json');
        if (!rawData) return;

        const data = JSON.parse(rawData) as { type: string; label: string; color: string };
        if (!data.type || !data.label) return;

        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        onDropNode({ ...data, position });
      } catch {
        // Invalid JSON, ignore
      }
    },
    [screenToFlowPosition, onDropNode]
  );

  return (
    <div
      ref={dropRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn('relative w-full h-full', isDragOver && 'drop-zone-active')}
    >
      {children}
      {/* Drop indicator overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
          <div className="bg-teal-50/80 dark:bg-teal-900/30 backdrop-blur-sm rounded-2xl border-2 border-dashed border-teal-400/60 dark:border-teal-600/60 px-6 py-4 shadow-lg">
            <p className="text-sm font-medium text-teal-700 dark:text-teal-300">
              Drop here to create node
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
