import { create } from 'zustand';

export interface Annotation {
  id: string;
  text: string;
  position: { x: number; y: number };
  color: string;
}

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

interface AnnotationState {
  annotations: Annotation[];

  addAnnotation: (position: { x: number; y: number }) => void;
  updateAnnotation: (id: string, updates: Partial<Pick<Annotation, 'text' | 'position' | 'color'>>) => void;
  deleteAnnotation: (id: string) => void;
}

let annotationCounter = 0;

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotations: [],

  addAnnotation: (position: { x: number; y: number }) => {
    const { annotations } = get();
    if (annotations.length >= 20) {
      return;
    }
    const id = `annotation-${++annotationCounter}-${Date.now()}`;
    const colorIndex = annotations.length % ANNOTATION_COLORS.length;
    const newAnnotation: Annotation = {
      id,
      text: '',
      position,
      color: ANNOTATION_COLORS[colorIndex],
    };
    set((state) => ({
      annotations: [...state.annotations, newAnnotation],
    }));
  },

  updateAnnotation: (id, updates) => {
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    }));
  },

  deleteAnnotation: (id) => {
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
    }));
  },
}));
