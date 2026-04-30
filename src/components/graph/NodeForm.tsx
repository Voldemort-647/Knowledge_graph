'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { createNode, updateNode, deleteNode } from '@/services/api';

const PRESET_COLORS = [
  '#0d9488', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7',
  '#ef4444', '#14b8a6', '#6366f1', '#d946ef', '#84cc16',
];

interface EditingNode {
  id: string;
  label: string;
  imageUrl: string | null;
  color: string;
}

interface NodeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNodeCreated?: () => void;
  editingNode?: EditingNode | null;
  onNodeUpdated?: () => void;
  onNodeDeleted?: (id: string) => void;
}

export default function NodeForm({
  open,
  onOpenChange,
  onNodeCreated,
  editingNode,
  onNodeUpdated,
  onNodeDeleted,
}: NodeFormProps) {
  const [label, setLabel] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!editingNode;

  useEffect(() => {
    if (editingNode && open) {
      setLabel(editingNode.label);
      setImageUrl(editingNode.imageUrl || '');
      setColor(editingNode.color || PRESET_COLORS[0]);
    }
  }, [editingNode, open]);

  const resetForm = () => {
    setLabel('');
    setImageUrl('');
    setColor(PRESET_COLORS[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    setIsSubmitting(true);
    try {
      if (isEditing && editingNode) {
        await updateNode({
          id: editingNode.id,
          label: label.trim(),
          imageUrl: imageUrl.trim() || undefined,
          color,
        });
        toast.success(`Node "${label.trim()}" updated successfully`);
        onNodeUpdated?.();
      } else {
        await createNode({
          label: label.trim(),
          imageUrl: imageUrl.trim() || undefined,
          color,
        });
        toast.success(`Node "${label.trim()}" created successfully`);
        resetForm();
        onNodeCreated?.();
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : isEditing ? 'Failed to update node' : 'Failed to create node');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingNode) return;
    try {
      await deleteNode(editingNode.id);
      toast.success(`Node "${editingNode.label}" deleted`);
      onOpenChange(false);
      resetForm();
      onNodeDeleted?.(editingNode.id);
    } catch {
      toast.error('Failed to delete node');
    }
  };

  // Convert hex to rgba with opacity
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !isEditing) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-sm"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Node</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md overflow-hidden">
        {/* Gradient top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-500" />
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }} />
        <div className="relative">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isEditing ? 'Edit Node' : 'Create New Node'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the node properties.'
              : 'Add a new entity to your knowledge graph.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="node-label" className="text-sm font-medium">
              Label <span className="text-red-500">*</span>
            </Label>
            <Input
              id="node-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Tesla, Albert Einstein, Python"
              className="h-9 focus-glow-teal"
              autoFocus
              required
            />
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="node-image" className="text-sm font-medium">
              Image URL <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="node-image"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="h-9 focus-glow-teal"
            />
          </div>

          {/* Color Picker - 2-row grid with tooltips */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Color</Label>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  title={c}
                  className={`
                    h-8 rounded-lg transition-all duration-200 flex items-center justify-center
                    hover:scale-110 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500
                    ${color === c ? 'ring-2 ring-offset-2 ring-teal-500 scale-110 shadow-md' : 'ring-1 ring-gray-200 dark:ring-neutral-600 hover:ring-teal-300 dark:hover:ring-teal-600'}
                  `}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                >
                  {color === c && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Preview - looks like actual graph node */}
          {label.trim() && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border bg-gradient-to-br from-gray-50 to-white dark:from-neutral-800/50 dark:to-neutral-900/50 p-3 shadow-inner"
            >
              <p className="text-xs text-muted-foreground mb-2">Preview</p>
              <div className="relative overflow-hidden">
                {/* Glow effect */}
                <div
                  className="absolute inset-0 rounded-xl"
                  style={{
                    boxShadow: `0 0 20px 4px ${hexToRgba(color, 0.2)}`,
                    opacity: 0,
                  }}
                />
                <div
                  className="relative flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-md"
                  style={{ borderLeft: `4px solid ${color}`, borderRadius: '12px' }}
                >
                  {/* Gradient overlay */}
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                      background: `linear-gradient(135deg, ${hexToRgba(color, 0.03)}, transparent 60%)`,
                    }}
                  />
                  <div className="relative flex items-center gap-3">
                    <div
                      className="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-semibold text-sm text-gray-800">
                      {label.trim()}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <DialogFooter className="pt-2 gap-2">
            {isEditing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="gap-1.5 mr-auto"
                    disabled={isSubmitting}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Node</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete &quot;{editingNode?.label}&quot;? This will also remove all connected edges.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-rose-500 hover:bg-rose-600"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!isEditing) resetForm();
                onOpenChange(false);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!label.trim() || isSubmitting}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {isEditing ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                <>
                  {isEditing ? null : <Plus className="size-4" />}
                  {isEditing ? 'Save Changes' : 'Create Node'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
