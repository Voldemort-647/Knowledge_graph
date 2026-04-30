'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  type Connection,
} from '@xyflow/react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network,
  RotateCcw,
  Trash2,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import GraphCanvas, {
  mapApiToReactFlow,
  type CustomNodeType,
} from '@/components/graph/GraphCanvas';
import NodeForm from '@/components/graph/NodeForm';
import EdgeForm from '@/components/graph/EdgeForm';
import PromptInput from '@/components/graph/PromptInput';
import {
  fetchGraph,
  deleteNode as apiDeleteNode,
  deleteEdge as apiDeleteEdge,
  createEdge,
  type NLPResponse,
} from '@/services/api';

/* ─── Inner Page (needs ReactFlowProvider context) ─── */
function KnowledgeGraphPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nodeFormOpen, setNodeFormOpen] = useState(false);
  const [edgeFormOpen, setEdgeFormOpen] = useState(false);
  const [nlpExpanded, setNlpExpanded] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  // Load graph from API on mount
  const loadGraph = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchGraph();
      const { nodes: rfNodes, edges: rfEdges } = mapApiToReactFlow(data);
      setNodes(rfNodes);
      setEdges(rfEdges);
    } catch {
      toast.error('Failed to load graph');
    } finally {
      setIsLoading(false);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  // Handle node deletion
  const handleDeleteNode = useCallback(
    async (id: string) => {
      try {
        await apiDeleteNode(id);
        setNodes((nds) => nds.filter((n) => n.id !== id));
        // Also remove connected edges
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      } catch {
        toast.error('Failed to delete node');
      }
    },
    [setNodes, setEdges]
  );

  // Handle edge deletion
  const handleDeleteEdge = useCallback(
    async (id: string) => {
      try {
        await apiDeleteEdge(id);
        setEdges((eds) => eds.filter((e) => e.id !== id));
      } catch {
        toast.error('Failed to delete edge');
      }
    },
    [setEdges]
  );

  // Handle new connection from handle drag
  const handleConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) {
        toast.error('Cannot create a self-loop');
        return;
      }
      try {
        await createEdge({
          sourceNodeId: connection.source,
          targetNodeId: connection.target,
          relationship: 'related_to',
        });
        // Reload graph to get the new edge with proper formatting
        await loadGraph();
        toast.success('Edge created between nodes');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create edge');
      }
    },
    [loadGraph]
  );

  // Handle NLP result
  const handleNLPResult = useCallback(
    (data: NLPResponse) => {
      const { nodes: rfNodes, edges: rfEdges } = mapApiToReactFlow({
        nodes: data.nodes,
        edges: data.edges,
      });
      setNodes(rfNodes);
      setEdges(rfEdges);
    },
    [setNodes, setEdges]
  );

  // Keyboard delete handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }
        // Delete selected nodes
        const selectedNodes = nodes.filter((n) => n.selected);
        const selectedEdges = edges.filter((e) => e.selected);

        if (selectedNodes.length > 0) {
          selectedNodes.forEach((n) => handleDeleteNode(n.id));
        }
        if (selectedEdges.length > 0) {
          selectedEdges.forEach((e) => handleDeleteEdge(e.id));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, handleDeleteNode, handleDeleteEdge]);

  // Fit view helper
  const handleFitView = useCallback(() => {
    // The ReactFlow fitView is handled by the component
    loadGraph();
  }, [loadGraph]);

  // Clear all
  const handleClearAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setClearConfirmOpen(false);
    toast.info('Canvas cleared. Refresh to reload from database.');
  }, [setNodes, setEdges]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-stone-50 to-gray-100">
      {/* ─── Header ─── */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-sm">
              <Network className="size-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-gray-900 leading-tight">
                Knowledge Graph Builder
              </h1>
              <p className="text-[11px] text-gray-500 leading-tight">
                Visualize entities and relationships
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <NodeForm
              open={nodeFormOpen}
              onOpenChange={setNodeFormOpen}
              onNodeCreated={loadGraph}
            />
            <EdgeForm
              open={edgeFormOpen}
              onOpenChange={setEdgeFormOpen}
              onEdgeCreated={loadGraph}
            />
          </div>
        </div>
      </header>

      {/* ─── NLP Panel ─── */}
      <PromptInput
        onResult={handleNLPResult}
        isExpanded={nlpExpanded}
        onToggleExpand={() => setNlpExpanded((p) => !p)}
      />

      {/* ─── Main Canvas Area ─── */}
      <main className="flex-1 relative overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="space-y-4 text-center">
              <Skeleton className="h-8 w-48 mx-auto" />
              <Skeleton className="h-4 w-32 mx-auto" />
              <p className="text-sm text-muted-foreground">Loading graph...</p>
            </div>
          </div>
        ) : (
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onDeleteNode={handleDeleteNode}
            onDeleteEdge={handleDeleteEdge}
            onConnectNew={handleConnect}
          />
        )}

        {/* ─── Floating Toolbar ─── */}
        <AnimatePresence>
          {!isLoading && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="absolute right-4 top-4 z-20 flex flex-col gap-2"
            >
              <TooltipProvider delayDuration={300}>
                {/* Refresh */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      className="bg-white/90 backdrop-blur-sm shadow-md border-gray-200 hover:bg-white hover:border-teal-200 h-9 w-9 rounded-lg"
                      onClick={loadGraph}
                    >
                      <RotateCcw className="size-4 text-gray-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Refresh graph</TooltipContent>
                </Tooltip>

                {/* Fit View */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      className="bg-white/90 backdrop-blur-sm shadow-md border-gray-200 hover:bg-white hover:border-teal-200 h-9 w-9 rounded-lg"
                      onClick={handleFitView}
                    >
                      <Maximize2 className="size-4 text-gray-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Fit view</TooltipContent>
                </Tooltip>

                {/* Clear All */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      className="bg-white/90 backdrop-blur-sm shadow-md border-gray-200 hover:bg-red-50 hover:border-red-200 h-9 w-9 rounded-lg"
                      onClick={() => setClearConfirmOpen(true)}
                    >
                      <Trash2 className="size-4 text-gray-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Clear canvas</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Empty State ─── */}
        {!isLoading && nodes.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <div className="text-center space-y-3 max-w-md px-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center mx-auto shadow-inner">
                <Network className="size-8 text-teal-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-700">
                Your graph is empty
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Add nodes and edges using the buttons above, or try the AI generator to create a graph from natural language.
              </p>
              <div className="flex gap-2 justify-center pointer-events-auto">
                <Button
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
                  onClick={() => setNodeFormOpen(true)}
                >
                  Add Node
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-teal-200 text-teal-700 hover:bg-teal-50 gap-2"
                  onClick={() => setNlpExpanded(true)}
                >
                  <ZoomIn className="size-4" />
                  Try AI
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Node/Edge Count Badge ─── */}
        {!isLoading && nodes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute left-4 bottom-4 z-20"
          >
            <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm px-3 py-1.5 flex items-center gap-3 text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'}
              </span>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                {edges.length} {edges.length === 1 ? 'edge' : 'edges'}
              </span>
            </div>
          </motion.div>
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="bg-white/60 backdrop-blur-sm border-t border-gray-200 py-3 px-4 mt-auto">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between text-xs text-gray-500">
          <p>Knowledge Graph Builder &middot; Drag nodes to rearrange &middot; Right-click to delete</p>
          <p className="hidden sm:block">Press Delete/Backspace to remove selected items</p>
        </div>
      </footer>

      {/* ─── Clear Confirmation Dialog ─── */}
      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Clear Canvas</DialogTitle>
            <DialogDescription>
              This will remove all nodes and edges from the canvas. This does not delete data from the database.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClearConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={handleClearAll}
            >
              <Trash2 className="size-4" />
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Page Wrapper with ReactFlowProvider ─── */
export default function Home() {
  return (
    <ReactFlowProvider>
      <KnowledgeGraphPage />
    </ReactFlowProvider>
  );
}
