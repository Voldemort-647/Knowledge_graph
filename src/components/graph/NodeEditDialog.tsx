'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Pencil, Loader2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { updateNode, deleteNode } from '@/services/api';

const PRESET_COLORS = [
  '#0d9488', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7',
  '#ef4444', '#14b8a6', '#6366f1', '#d946ef', '#84cc16',
];

interface NodeEditDialogProps {
  node: { id: string; label: string; imageUrl: string | null; color: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNodeUpdated: () => void;
  onNodeDeleted: (id: string) => void;
}

export default function NodeEditDialog({
  node,
  open,
  onOpenChange,
  onNodeUpdated,
  onNodeDeleted,
}: NodeEditDialogProps) {
  const [label, setLabel] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (node && open) {
      setLabel(node.label);
      setImageUrl(node.imageUrl || '');
      setColor(node.color || PRESET_COLORS[0]);
    }
  }, [node, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !node) return;

    setIsSubmitting(true);
    try {
      await updateNode({
        id: node.id,
        label: label.trim(),
        imageUrl: imageUrl.trim() || undefined,
        color,
      });
      toast.success(`Node "${label.trim()}" updated successfully`);
      onOpenChange(false);
      onNodeUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update node');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!node) return;
    setIsDeleting(true);
    try {
      await deleteNode(node.id);
      toast.success(`Node "${node.label}" deleted`);
      onOpenChange(false);
      onNodeDeleted(node.id);
    } catch {
      toast.error('Failed to delete node');
    } finally {
      setIsDeleting(false);
    }
  };

  const nodeColor = color;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600">
              <Pencil className="size-3.5 text-white" />
            </div>
            Edit Node
          </DialogTitle>
          <DialogDescription>
            Update the node properties.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="edit-label" className="text-sm font-medium">
              Label <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Tesla, Albert Einstein"
              className="h-9"
              autoFocus
              required
            />
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="edit-image" className="text-sm font-medium">
              Image URL <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="edit-image"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="h-9"
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Color</Label>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`
                    h-8 rounded-lg transition-all duration-150 flex items-center justify-center
                    hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500
                    ${color === c ? 'ring-2 ring-offset-2 ring-teal-500 scale-105' : 'ring-1 ring-gray-200 hover:ring-gray-300'}
                  `}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                  title={c}
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

          {/* Preview */}
          {label.trim() && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border bg-gradient-to-r from-gray-50 to-white p-3"
            >
              <p className="text-xs text-muted-foreground mb-2">Preview</p>
              <div
                className="relative flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-md overflow-hidden"
              >
                {/* Left border accent */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                  style={{ backgroundColor: nodeColor }}
                />
                {/* Glow effect */}
                <div
                  className="absolute inset-0 rounded-xl opacity-30"
                  style={{
                    boxShadow: `0 0 20px 4px ${nodeColor}40`,
                  }}
                />
                <div className="relative flex items-center gap-3">
                  <div
                    className="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-sm"
                    style={{ backgroundColor: nodeColor }}
                  />
                  <span className="font-semibold text-sm text-gray-800">
                    {label.trim()}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          <DialogFooter className="pt-2 gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="gap-1.5 mr-auto"
                  disabled={isSubmitting || isDeleting}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Node</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{node?.label}&quot;? This will also remove all connected edges. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-rose-500 hover:bg-rose-600"
                  >
                    {isDeleting ? (
                      <Loader2 className="size-4 animate-spin mr-1" />
                    ) : null}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
                  Saving...
                </>
              ) : (
                <>
                  <Pencil className="size-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
