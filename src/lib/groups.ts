// Group management utilities for Visual Knowledge Graph Builder

// Preset group color palette (no indigo/blue)
export const GROUP_COLORS = [
  { name: 'Teal', value: '#0d9488' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Sky', value: '#0ea5e9' },
] as const;

// Default group color
export const DEFAULT_GROUP_COLOR = '#0d9488';

// Get the next available color from the palette (round-robin)
export function getNextGroupColor(usedColors: string[]): string {
  const unusedColors = GROUP_COLORS.filter(
    (c) => !usedColors.includes(c.value)
  );
  if (unusedColors.length > 0) {
    return unusedColors[0].value;
  }
  // Fallback: pick from full palette based on count
  const idx = usedColors.length % GROUP_COLORS.length;
  return GROUP_COLORS[idx].value;
}

// Convert hex color to rgba
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Generate a default group label based on node count
export function generateGroupLabel(nodeCount: number, existingLabels: string[]): string {
  const baseLabel = `Group`;
  // Try "Group", "Group 2", "Group 3", etc.
  if (!existingLabels.includes(baseLabel)) {
    return baseLabel;
  }
  let counter = 2;
  while (existingLabels.includes(`${baseLabel} ${counter}`)) {
    counter++;
  }
  return `${baseLabel} ${counter}`;
}
