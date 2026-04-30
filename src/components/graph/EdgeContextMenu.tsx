'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Edge } from '@xyflow/react';

interface EdgeContextMenuProps {
  edge: Edge | null;
  position: { x: number; y: number };
  visible: boolean;
  onEdit: (edgeId: string, newLabel: string) => void;
  onDelete: (edgeId: string) => void;
  onClose: () => void;
}

export default function EdgeContextMenu({
  edge,
  position,
  visible,
  onEdit,
  onDelete,
  onClose,
}: EdgeContextMenuProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  // Initialize edit value when the component becomes visible with a new edge
  const handleEdit = () => {
    setEditValue(edge?.label ? String(edge.label) : '');
    setIsEditing(true);
  };

  // Close on outside click
  useEffect(() => {
    if (!visible) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-edge-context-menu]')) return;
      onClose();
    };
    // Delay to avoid immediate close from right-click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!visible || !edge) return null;

  const handleEditSubmit = () => {
    if (editValue.trim()) {
      onEdit(edge.id, editValue.trim());
    }
    setIsEditing(false);
    onClose();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSubmit();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    onDelete(edge.id);
    onClose();
  };

  return (
    <div
      data-edge-context-menu
      className="fixed z-50 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-gray-200 dark:border-neutral-700 py-1.5 min-w-[180px] overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
      }}
      tabIndex={-1}
    >
      {/* Edge label header */}
      <div className="px-3 py-1.5 border-b border-gray-100 dark:border-neutral-700/50">
        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
          {edge.label ? `Edge: "${edge.label}"` : 'Edge (no label)'}
        </p>
      </div>

      {isEditing ? (
        <div className="px-3 py-2 space-y-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleEditKeyDown}
            placeholder="Relationship label"
            className="h-8 text-sm"
            autoFocus
          />
          <div className="flex gap-1.5 justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleEditSubmit}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={handleEdit}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700/50 transition-colors"
          >
            <Pencil className="size-3.5 text-gray-400" />
            Edit Label
          </button>
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="size-3.5" />
            Delete Edge
          </button>
        </>
      )}
    </div>
  );
}
