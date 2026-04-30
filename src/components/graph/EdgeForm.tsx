'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { GitBranch, Loader2 } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createEdge, fetchNodes, type RawNode } from '@/services/api';

interface EdgeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdgeCreated?: () => void;
}

export default function EdgeForm({ open, onOpenChange, onEdgeCreated }: EdgeFormProps) {
  const [nodes, setNodes] = useState<RawNode[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [relationship, setRelationship] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingNodes, setIsLoadingNodes] = useState(false);

  // Fetch nodes when dialog opens
  const loadNodes = useCallback(async () => {
    if (!open) return;
    setIsLoadingNodes(true);
    try {
      const data = await fetchNodes();
      setNodes(data);
    } catch {
      toast.error('Failed to load nodes');
    } finally {
      setIsLoadingNodes(false);
    }
  }, [open]);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  const resetForm = () => {
    setSourceId('');
    setTargetId('');
    setRelationship('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceId || !targetId || !relationship.trim()) return;
    if (sourceId === targetId) {
      toast.error('Source and target must be different nodes');
      return;
    }

    setIsSubmitting(true);
    try {
      await createEdge({
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        relationship: relationship.trim(),
      });
      toast.success(`Edge "${relationship.trim()}" created successfully`);
      resetForm();
      onOpenChange(false);
      onEdgeCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create edge');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSource = nodes.find((n) => n.id === sourceId);
  const selectedTarget = nodes.find((n) => n.id === targetId);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-2 border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800 shadow-sm"
        >
          <GitBranch className="size-4" />
          <span className="hidden sm:inline">Add Edge</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Create New Edge</DialogTitle>
          <DialogDescription>
            Connect two nodes with a relationship.
          </DialogDescription>
        </DialogHeader>

        {nodes.length < 2 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              {isLoadingNodes
                ? 'Loading nodes...'
                : 'You need at least 2 nodes to create an edge.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Source Node */}
            <div className="space-y-2">
              <Label htmlFor="source-node" className="text-sm font-medium">
                Source Node <span className="text-red-500">*</span>
              </Label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger id="source-node" className="w-full">
                  <SelectValue placeholder="Select source node" />
                </SelectTrigger>
                <SelectContent>
                  {nodes.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: node.color }}
                        />
                        {node.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Node */}
            <div className="space-y-2">
              <Label htmlFor="target-node" className="text-sm font-medium">
                Target Node <span className="text-red-500">*</span>
              </Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger id="target-node" className="w-full">
                  <SelectValue placeholder="Select target node" />
                </SelectTrigger>
                <SelectContent>
                  {nodes.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: node.color }}
                        />
                        {node.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Relationship */}
            <div className="space-y-2">
              <Label htmlFor="relationship" className="text-sm font-medium">
                Relationship <span className="text-red-500">*</span>
              </Label>
              <Input
                id="relationship"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g., founded, works_at, related_to"
                className="h-9"
                autoFocus
                required
              />
            </div>

            {/* Preview */}
            {selectedSource && selectedTarget && relationship.trim() && (
              <div className="rounded-lg border bg-gray-50 p-3">
                <p className="text-xs text-muted-foreground mb-2">Preview</p>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: selectedSource.color }}
                    />
                    <span className="font-semibold">{selectedSource.label}</span>
                  </div>
                  <span className="text-muted-foreground mx-1">→</span>
                  <span className="text-teal-600 font-medium px-2 py-0.5 bg-teal-50 rounded-full text-xs">
                    {relationship.trim()}
                  </span>
                  <span className="text-muted-foreground mx-1">→</span>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: selectedTarget.color }}
                    />
                    <span className="font-semibold">{selectedTarget.label}</span>
                  </div>
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
                disabled={
                  !sourceId ||
                  !targetId ||
                  !relationship.trim() ||
                  sourceId === targetId ||
                  isSubmitting
                }
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <GitBranch className="size-4" />
                    Create Edge
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
