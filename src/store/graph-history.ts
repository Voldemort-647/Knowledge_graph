import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import type { CustomNodeData } from '@/components/graph/GraphCanvas';

export interface GraphSnapshot {
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
}

interface GraphHistoryState {
  past: GraphSnapshot[];
  future: GraphSnapshot[];
  maxHistory: number;

  pushSnapshot: (snapshot: GraphSnapshot) => void;
  undo: () => GraphSnapshot | null;
  redo: () => GraphSnapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
}

export const useGraphHistory = create<GraphHistoryState>((set, get) => ({
  past: [],
  future: [],
  maxHistory: 50,

  pushSnapshot: (snapshot: GraphSnapshot) => {
    const { past, future, maxHistory } = get();
    const newPast = [...past, snapshot];
    // Trim oldest entries if exceeding max
    if (newPast.length > maxHistory) {
      newPast.splice(0, newPast.length - maxHistory);
    }
    set({
      past: newPast,
      future: [], // Clear future when new action is taken
    });
  },

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return null;

    const newPast = [...past];
    const previous = newPast.pop()!;

    set({
      past: newPast,
      future: [previous, ...future],
    });

    return previous;
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return null;

    const newFuture = [...future];
    const next = newFuture.shift()!;

    set({
      past: [...past, next],
      future: newFuture,
    });

    return next;
  },

  canUndo: () => {
    return get().past.length > 0;
  },

  canRedo: () => {
    return get().future.length > 0;
  },

  clearHistory: () => {
    set({ past: [], future: [] });
  },
}));
