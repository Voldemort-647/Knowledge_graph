'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
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
import { createNode } from '@/services/api';

const PRESET_COLORS = [
  '#0d9488',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#a855f7',
];

interface NodeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNodeCreated?: () => void;
}

export default function NodeForm({ open, onOpenChange, onNodeCreated }: NodeFormProps) {
  const [label, setLabel] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await createNode({
        label: label.trim(),
        imageUrl: imageUrl.trim() || undefined,
        color,
      });
      toast.success(`Node "${label.trim()}" created successfully`);
      resetForm();
      onOpenChange(false);
      onNodeCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create node');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-sm"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Node</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Create New Node</DialogTitle>
          <DialogDescription>
            Add a new entity to your knowledge graph.
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
              className="h-9"
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
              className="h-9"
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`
                    w-7 h-7 rounded-full transition-all duration-150
                    hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500
                    ${color === c ? 'ring-2 ring-offset-2 ring-teal-500 scale-110' : 'ring-1 ring-gray-200'}
                  `}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          {label.trim() && (
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="text-xs text-muted-foreground mb-2">Preview</p>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full ring-1 ring-white shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="font-semibold text-sm">{label.trim()}</span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { resetForm(); onOpenChange(false); }}
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
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Create Node
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
