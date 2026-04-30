'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { X, GripVertical } from 'lucide-react';
import { useAnnotationStore } from '@/store/annotation-store';
import { hexToRgba } from '@/lib/groups';

const ANNOTATION_COLORS = [
  '#f59e0b',
  '#f43f5e',
  '#10b981',
  '#0d9488',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
  '#84cc16',
];

export default function AnnotationLayer() {
  const { annotations, updateAnnotation, deleteAnnotation } = useAnnotationStore();
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const handleDragStart = useCallback((e: React.MouseEvent, annotationId: string) => {
    e.preventDefault();
    const annotation = annotations.find((a) => a.id === annotationId);
    if (!annotation) return;
    dragRef.current = {
      id: annotationId,
      startX: e.clientX,
      startY: e.clientY,
      origX: annotation.position.x,
      origY: annotation.position.y,
    };

    const handleDragMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = moveEvent.clientX - dragRef.current.startX;
      const dy = moveEvent.clientY - dragRef.current.startY;
      updateAnnotation(dragRef.current.id, {
        position: {
          x: dragRef.current.origX + dx,
          y: dragRef.current.origY + dy,
        },
      });
    };

    const handleDragEnd = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  }, [annotations, updateAnnotation]);

  return (
    <AnimatePresence>
      {annotations.map((annotation) => (
        <motion.div
          key={annotation.id}
          initial={{ opacity: 0, scale: 0.8, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="absolute z-30"
          style={{
            left: annotation.position.x,
            top: annotation.position.y,
          }}
        >
          <div
            className="w-52 rounded-xl shadow-lg border overflow-hidden"
            style={{
              borderColor: hexToRgba(annotation.color, 0.3),
              boxShadow: `0 4px 20px ${hexToRgba(annotation.color, 0.1)}`,
            }}
          >
            {/* Colored header bar + drag handle + delete button */}
            <div
              className="flex items-center justify-between px-2.5 py-1.5 cursor-grab active:cursor-grabbing select-none"
              style={{
                backgroundColor: hexToRgba(annotation.color, 0.12),
                borderBottom: `1px solid ${hexToRgba(annotation.color, 0.2)}`,
              }}
              onMouseDown={(e) => handleDragStart(e, annotation.id)}
            >
              <div className="flex items-center gap-1.5">
                <GripVertical className="size-3" style={{ color: hexToRgba(annotation.color, 0.5) }} />
                <div className="flex gap-0.5">
                  {ANNOTATION_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateAnnotation(annotation.id, { color: c });
                      }}
                      className="w-3 h-3 rounded-full transition-transform hover:scale-125"
                      style={{
                        backgroundColor: c,
                        opacity: c === annotation.color ? 1 : 0.3,
                      }}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteAnnotation(annotation.id);
                }}
                className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="size-3" />
              </button>
            </div>

            {/* Editable text area */}
            <div className="p-2">
              <textarea
                value={annotation.text}
                onChange={(e) => updateAnnotation(annotation.id, { text: e.target.value })}
                placeholder="Add a note..."
                className="w-full h-16 text-xs bg-transparent border-0 resize-none focus:outline-none text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
