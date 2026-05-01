'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Share2, Copy, Check, Download, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  generateShareUrl,
  type SharedGraphData,
} from '@/lib/graph-sharing';
import { importGraph } from '@/services/api';
import type { Node, Edge } from '@xyflow/react';

interface ShareButtonProps {
  nodes: Node[];
  edges: Edge[];
  onGraphUpdated?: () => void;
}

export default function ShareButton({ nodes, edges, onGraphUpdated }: ShareButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = nodes.length > 0
    ? generateShareUrl(
        nodes as Array<{
          id: string;
          data: { label: string; color?: string; imageUrl?: string | null };
          position: { x: number; y: number };
        }>,
        edges as Array<{ id: string; source: string; target: string; label?: string }>
      )
    : '';

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy link');
    }
  }, [shareUrl]);

  const handleOpen = useCallback(() => {
    setDialogOpen(true);
    setCopied(false);
  }, []);

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              onClick={handleOpen}
              disabled={nodes.length === 0}
            >
              <Share2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {nodes.length > 0 ? 'Share graph via link' : 'Add nodes to share'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600">
                <Share2 className="size-4 text-white" />
              </div>
              Share Graph
            </DialogTitle>
            <DialogDescription>
              Copy the link below to share your knowledge graph with others. Anyone with this link can import the graph.
            </DialogDescription>
          </DialogHeader>

          {nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                <Link2 className="size-8 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your graph is empty. Add some nodes to generate a shareable link.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* URL preview */}
              <div className="relative group">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-neutral-800/80 border border-gray-200 dark:border-neutral-700">
                  <Link2 className="size-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <p className="text-xs text-gray-600 dark:text-gray-300 font-mono truncate flex-1 select-all">
                    {shareUrl}
                  </p>
                </div>
              </div>

              {/* Graph summary */}
              <div className="flex items-center gap-4 px-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2.5 py-1 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  {nodes.length} node{nodes.length !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  {edges.length} edge{edges.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={handleCopyLink}
              disabled={nodes.length === 0 || copied}
            >
              {copied ? (
                <>
                  <Check className="size-4 text-teal-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copy Link
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Import From Shared URL Dialog ─── */

interface ImportFromUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sharedData: SharedGraphData | null;
  onImported: () => void;
}

export function ImportFromUrlDialog({
  open,
  onOpenChange,
  sharedData,
  onImported,
}: ImportFromUrlDialogProps) {
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = useCallback(async () => {
    if (!sharedData) return;
    setIsImporting(true);
    try {
      const result = await importGraph({
        nodes: sharedData.nodes.map((n) => ({
          label: n.label,
          color: n.color,
          imageUrl: n.imageUrl ?? undefined,
          position: n.position,
        })),
        edges: sharedData.edges.map((e) => ({
          source: e.source,
          target: e.target,
          label: e.label,
        })),
      });
      toast.success(result.message || 'Graph imported successfully!');
      onImported();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import shared graph');
    } finally {
      setIsImporting(false);
    }
  }, [sharedData, onImported, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <motion.div
              initial={{ rotate: -10, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600"
            >
              <Download className="size-4 text-white" />
            </motion.div>
            Shared Graph Found
          </DialogTitle>
          <DialogDescription>
            This page contains a shared knowledge graph in the URL. Would you like to import it?
          </DialogDescription>
        </DialogHeader>

        {sharedData && (
          <div className="space-y-3">
            {/* Graph summary */}
            <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-neutral-800/80 border border-gray-200 dark:border-neutral-700">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2.5 py-1 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                {sharedData.nodes.length} node{sharedData.nodes.length !== 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                {sharedData.edges.length} edge{sharedData.edges.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Node preview */}
            {sharedData.nodes.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-1">
                  Nodes preview
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {sharedData.nodes.slice(0, 12).map((n, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: n.color }}
                      />
                      {n.label}
                    </span>
                  ))}
                  {sharedData.nodes.length > 12 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 px-1 py-0.5">
                      +{sharedData.nodes.length - 12} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Dismiss
          </Button>
          <Button
            className="gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-md shadow-teal-500/20"
            onClick={handleImport}
            disabled={isImporting}
          >
            <Download className="size-4" />
            {isImporting ? 'Importing...' : 'Import Graph'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
