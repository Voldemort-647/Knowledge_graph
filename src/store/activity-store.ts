import { create } from 'zustand';

export interface ActivityEntry {
  id: string;
  type: 'create_node' | 'delete_node' | 'create_edge' | 'delete_edge' | 'edit_node' | 'edit_edge' | 'layout' | 'clear' | 'import' | 'nlp' | 'duplicate_node';
  description: string;
  timestamp: number;
}

interface ActivityStore {
  entries: ActivityEntry[];
  maxEntries: number;
  addEntry: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void;
  clearEntries: () => void;
}

export const useActivityStore = create<ActivityStore>((set) => ({
  entries: [],
  maxEntries: 100,
  addEntry: (entry) =>
    set((state) => {
      const newEntry: ActivityEntry = {
        ...entry,
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
      };
      const entries = [newEntry, ...state.entries].slice(0, state.maxEntries);
      return { entries };
    }),
  clearEntries: () => set({ entries: [] }),
}));

export const ACTIVITY_COLORS: Record<ActivityEntry['type'], string> = {
  create_node: '#0d9488',
  delete_node: '#ef4444',
  create_edge: '#0d9488',
  delete_edge: '#ef4444',
  edit_node: '#f59e0b',
  edit_edge: '#f59e0b',
  layout: '#8b5cf6',
  clear: '#6b7280',
  import: '#0d9488',
  nlp: '#0d9488',
  duplicate_node: '#0d9488',
};

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
