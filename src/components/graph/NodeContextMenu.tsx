'use client';

import { useEffect } from 'react';
import { Pencil, Trash2, Crosshair, Link2, Copy } from 'lucide-react';
import type { CustomNodeType } from './GraphCanvas';

interface NodeContextMenuProps {
  node: CustomNodeType | null;
  position: { x: number; y: number };
  visible: boolean;
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onFocus: (nodeId: string) => void;
  onConnectFrom: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onClose: () => void;
}

export default function NodeContextMenu({
  node,
  position,
  visible,
  onEdit,
  onDelete,
  onFocus,
  onConnectFrom,
  onDuplicate,
  onClose,
}: NodeContextMenuProps) {
  // Close on outside click
  useEffect(() => {
    if (!visible) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-node-context-menu]')) return;
      onClose();
    };
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

  if (!visible || !node) return null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  // Adjust position to avoid going off-screen
  const adjustedPosition = {
    x: Math.min(position.x, typeof window !== 'undefined' ? window.innerWidth - 200 : position.x),
    y: Math.min(position.y, typeof window !== 'undefined' ? window.innerHeight - 250 : position.y),
  };

  return (
    <div
      data-node-context-menu
      className="fixed z-50 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/80 dark:border-neutral-700/60 py-1.5 min-w-[190px] overflow-hidden context-menu-enter"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
      tabIndex={-1}
    >
      {/* Node label header */}
      <div className="px-3 py-1.5 border-b border-gray-100 dark:border-neutral-700/50">
        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium truncate">
          {node.data.emoji ? `${node.data.emoji} ` : ''}
          {node.data.label}
        </p>
      </div>

      <button
        onClick={() => handleAction(() => onEdit(node.id))}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-300 transition-colors duration-150"
      >
        <Pencil className="size-3.5 text-gray-400" />
        Edit Node
      </button>

      <button
        onClick={() => handleAction(() => onFocus(node.id))}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-300 transition-colors duration-150"
      >
        <Crosshair className="size-3.5 text-gray-400" />
        Focus
      </button>

      <button
        onClick={() => handleAction(() => onConnectFrom(node.id))}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-300 transition-colors duration-150"
      >
        <Link2 className="size-3.5 text-gray-400" />
        Connect From
      </button>

      <button
        onClick={() => handleAction(() => onDuplicate(node.id))}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-300 transition-colors duration-150"
      >
        <Copy className="size-3.5 text-gray-400" />
        Duplicate
      </button>

      {/* Divider */}
      <div className="my-1 border-t border-gray-100 dark:border-neutral-700/50" />

      <button
        onClick={() => handleAction(() => onDelete(node.id))}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
      >
        <Trash2 className="size-3.5" />
        Delete Node
      </button>
    </div>
  );
}
