'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
} from '@xyflow/react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network,
  RotateCcw,
  Trash2,
  Maximize2,
  Search,
  BarChart3,
  Keyboard,
  ZoomIn,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from 'next-themes';
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
import NodeEditDialog from '@/components/graph/NodeEditDialog';
import ConnectionDialog from '@/components/graph/ConnectionDialog';
import SearchPanel from '@/components/graph/SearchPanel';
import StatsPanel from '@/components/graph/StatsPanel';
import ExportButton from '@/components/graph/ExportButton';
import KeyboardShortcutsDialog from '@/components/graph/KeyboardShortcutsDialog';
import NodeInspector from '@/components/graph/NodeInspector';
import PromptInput from '@/components/graph/PromptInput';
import {
  fetchGraph,
  deleteNode as apiDeleteNode,
  deleteEdge as apiDeleteEdge,
  createEdge,
  clearGraph,
  type NLPResponse,
} from '@/services/api';

/* ─── Toolbar button class ─── */
const toolbarBtnBase =
  'h-9 w-9 rounded-lg backdrop-blur-md border shadow-md transition-all duration-200';

const toolbarBtnInactive =
  'bg-white/70 dark:bg-neutral-900/70 border-gray-200/60 dark:border-neutral-700/50 text-gray-600 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-neutral-800/90 hover:border-teal-300 dark:hover:border-teal-700 hover:text-teal-700 dark:hover:text-teal-400 hover:scale-105';

const toolbarBtnActive =
  'bg-teal-50/80 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700/60 text-teal-700 dark:text-teal-400 shadow-teal-100/50 dark:shadow-teal-900/30';

/* ─── Inner Page (needs ReactFlowProvider context) ─── */
function KnowledgeGraphPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nodeFormOpen, setNodeFormOpen] = useState(false);
  const [edgeFormOpen, setEdgeFormOpen] = useState(false);
  const [nlpExpanded, setNlpExpanded] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  // New state for dialogs and panels
  const [editingNode, setEditingNode] = useState<{
    id: string; label: string; imageUrl: string | null; color: string;
  } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [connectionData, setConnectionData] = useState<{
    source: string; target: string; sourceLabel: string; targetLabel: string;
  } | null>(null);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [statsPanelOpen, setStatsPanelOpen] = useState(false);
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);

  const { fitView, setCenter, getNodes } = useReactFlow();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Compute selected nodes from React Flow state
  const selectedNodes = useMemo(
    () => nodes.filter((n) => n.selected),
    [nodes]
  );

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

  // Handle new connection from handle drag — open ConnectionDialog
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) {
        toast.error('Cannot create a self-loop');
        return;
      }

      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return;

      setConnectionData({
        source: connection.source,
        target: connection.target,
        sourceLabel: sourceNode.data.label,
        targetLabel: targetNode.data.label,
      });
      setConnectionDialogOpen(true);
    },
    [nodes]
  );

  // Handle connection dialog confirm
  const handleConnectionConfirm = useCallback(
    async (relationship: string) => {
      if (!connectionData) return;
      try {
        await createEdge({
          sourceNodeId: connectionData.source,
          targetNodeId: connectionData.target,
          relationship,
        });
        toast.success(`Connection "${relationship}" created`);
        await loadGraph();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create connection');
      }
      setConnectionData(null);
      setConnectionDialogOpen(false);
    },
    [connectionData, loadGraph]
  );

  // Handle connection dialog close — remove any temp edge
  const handleConnectionDialogClose = useCallback(
    (open: boolean) => {
      if (!open) {
        setConnectionData(null);
      }
      setConnectionDialogOpen(open);
    },
    []
  );

  // Handle node double-click → open NodeEditDialog
  const handleNodeDoubleClick = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setEditingNode({
          id: node.id,
          label: node.data.label,
          imageUrl: node.data.imageUrl || null,
          color: node.data.color || '#0d9488',
        });
        setEditDialogOpen(true);
      }
    },
    [nodes]
  );

  // Handle node updated from edit dialog
  const handleNodeUpdated = useCallback(() => {
    loadGraph();
  }, [loadGraph]);

  // Handle node deleted from edit dialog
  const handleNodeDeleted = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [setNodes, setEdges]
  );

  // Handle search node select → center on node
  const handleSearchNodeSelect = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setCenter(node.position.x, node.position.y, { zoom: 1.5, duration: 500 });
        // Select the node
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            selected: n.id === nodeId,
          }))
        );
      }
      setSearchPanelOpen(false);
    },
    [nodes, setCenter, setNodes]
  );

  // Handle search node highlight
  const handleSearchNodeHighlight = useCallback(
    (nodeId: string | null) => {
      if (nodeId === null) {
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            className: undefined,
          }))
        );
      } else {
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            className: n.id === nodeId ? 'highlighted' : 'dimmed',
          }))
        );
      }
    },
    [setNodes]
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

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (e.key === '?' && !isTyping) {
        e.preventDefault();
        setShortcutsDialogOpen(true);
        return;
      }

      if (e.key === 'Escape') {
        // Deselect all
        setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
        setEdges((eds) => eds.map((ed) => ({ ...ed, selected: false })));
        return;
      }

      // Ctrl+N — new node
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        setNodeFormOpen(true);
        return;
      }

      // Ctrl+E — new edge
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        setEdgeFormOpen(true);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isTyping) return;
        const selNodes = nodes.filter((n) => n.selected);
        const selEdges = edges.filter((ed) => ed.selected);

        if (selNodes.length > 0) {
          selNodes.forEach((n) => handleDeleteNode(n.id));
        }
        if (selEdges.length > 0) {
          selEdges.forEach((ed) => handleDeleteEdge(ed.id));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, handleDeleteNode, handleDeleteEdge, setNodes, setEdges]);

  // Listen for node-edit-click custom event from GraphCanvas
  useEffect(() => {
    const handleNodeEditClick = (e: Event) => {
      const customEvent = e as CustomEvent<{ nodeId: string }>;
      const nodeId = customEvent.detail.nodeId;
      handleNodeDoubleClick(nodeId);
    };
    window.addEventListener('node-edit-click', handleNodeEditClick);
    return () => window.removeEventListener('node-edit-click', handleNodeEditClick);
  }, [handleNodeDoubleClick]);

  // Fit view helper
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.3, duration: 300 });
  }, [fitView]);

  // Focus on node helper (for inspector)
  const handleFocusNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setCenter(node.position.x, node.position.y, { zoom: 1.5, duration: 500 });
      }
    },
    [nodes, setCenter]
  );

  // Clear all — including database
  const handleClearAll = useCallback(async () => {
    try {
      await clearGraph();
      setNodes([]);
      setEdges([]);
      setClearConfirmOpen(false);
      toast.success('Graph cleared successfully');
    } catch {
      toast.error('Failed to clear graph from database');
      setNodes([]);
      setEdges([]);
      setClearConfirmOpen(false);
    }
  }, [setNodes, setEdges]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-stone-50 to-gray-100 dark:from-neutral-950 dark:via-[#0f1419] dark:to-neutral-950">
      {/* ─── Header ─── */}
      <header className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-gray-200 dark:border-neutral-800 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-sm">
              <Network className="size-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
                Knowledge Graph Builder
              </h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                Visualize entities and relationships
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  >
                    {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isDark ? 'Light mode' : 'Dark mode'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

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
            <ExportButton nodes={nodes} edges={edges} onGraphUpdated={loadGraph} />
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
            onNodeDoubleClick={handleNodeDoubleClick}
          />
        )}

        {/* ─── Search Panel ─── */}
        <AnimatePresence>
          {searchPanelOpen && !isLoading && (
            <SearchPanel
              nodes={nodes.map((n) => ({
                id: n.id,
                label: n.data.label,
                color: n.data.color || '#0d9488',
              }))}
              onNodeSelect={handleSearchNodeSelect}
              onNodeHighlight={handleSearchNodeHighlight}
            />
          )}
        </AnimatePresence>

        {/* ─── Stats Panel ─── */}
        {!isLoading && (
          <StatsPanel isOpen={statsPanelOpen} onToggle={() => setStatsPanelOpen((p) => !p)} />
        )}

        {/* ─── Floating Toolbar (Glassmorphism) ─── */}
        <AnimatePresence>
          {!isLoading && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="absolute right-4 top-4 z-20 flex flex-col gap-1.5"
            >
              <TooltipProvider delayDuration={300}>
                {/* Search */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="icon"
                        variant="outline"
                        className={`${toolbarBtnBase} ${searchPanelOpen ? toolbarBtnActive : toolbarBtnInactive}`}
                        onClick={() => setSearchPanelOpen((p) => !p)}
                      >
                        <Search className="size-4" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="left">Search nodes</TooltipContent>
                </Tooltip>

                {/* Stats */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="icon"
                        variant="outline"
                        className={`${toolbarBtnBase} ${statsPanelOpen ? toolbarBtnActive : toolbarBtnInactive}`}
                        onClick={() => setStatsPanelOpen((p) => !p)}
                      >
                        <BarChart3 className="size-4" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="left">Graph statistics</TooltipContent>
                </Tooltip>

                {/* Keyboard Shortcuts */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="icon"
                        variant="outline"
                        className={`${toolbarBtnBase} ${toolbarBtnInactive}`}
                        onClick={() => setShortcutsDialogOpen(true)}
                      >
                        <Keyboard className="size-4" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="left">Keyboard shortcuts (?)</TooltipContent>
                </Tooltip>

                {/* Divider */}
                <div className="h-px bg-gray-200/60 dark:bg-neutral-700/40 mx-1.5" />

                {/* Refresh */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="icon"
                        variant="outline"
                        className={`${toolbarBtnBase} ${toolbarBtnInactive}`}
                        onClick={loadGraph}
                      >
                        <RotateCcw className="size-4" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="left">Refresh graph</TooltipContent>
                </Tooltip>

                {/* Fit View */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="icon"
                        variant="outline"
                        className={`${toolbarBtnBase} ${toolbarBtnInactive}`}
                        onClick={handleFitView}
                      >
                        <Maximize2 className="size-4" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="left">Fit view</TooltipContent>
                </Tooltip>

                {/* Clear All */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="icon"
                        variant="outline"
                        className={`${toolbarBtnBase} bg-white/70 dark:bg-neutral-900/70 border-gray-200/60 dark:border-neutral-700/50 text-gray-600 dark:text-gray-300 hover:bg-red-50/80 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800/50 hover:text-red-600 dark:hover:text-red-400 hover:scale-105 shadow-md`}
                        onClick={() => setClearConfirmOpen(true)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="left">Clear canvas</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Empty State with Animated Illustration ─── */}
        {!isLoading && nodes.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <div className="text-center space-y-4 max-w-md px-4">
              {/* Animated floating nodes illustration */}
              <div className="relative h-24 mx-auto max-w-[240px]">
                {/* Central node */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg">
                    <Network className="size-7 text-white" />
                  </div>
                </motion.div>

                {/* Satellite node 1 */}
                <motion.div
                  animate={{ y: [0, -6, 0], x: [0, 2, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute left-2 top-1"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-md">
                    <span className="text-[10px] font-bold text-white">A</span>
                  </div>
                </motion.div>

                {/* Satellite node 2 */}
                <motion.div
                  animate={{ y: [0, 6, 0], x: [0, -2, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  className="absolute right-2 bottom-1"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-md">
                    <span className="text-[10px] font-bold text-white">B</span>
                  </div>
                </motion.div>

                {/* Satellite node 3 */}
                <motion.div
                  animate={{ y: [0, 5, 0] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                  className="absolute right-4 top-2"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-400 to-rose-500 flex items-center justify-center shadow-sm">
                    <span className="text-[9px] font-bold text-white">C</span>
                  </div>
                </motion.div>

                {/* Connection lines (decorative SVG) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 240 96">
                  <motion.line
                    x1="120" y1="48" x2="36" y2="24"
                    stroke="currentColor"
                    className="text-gray-300 dark:text-neutral-600"
                    strokeWidth="1.5" strokeDasharray="4 3"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                  <motion.line
                    x1="120" y1="48" x2="200" y2="72"
                    stroke="currentColor"
                    className="text-gray-300 dark:text-neutral-600"
                    strokeWidth="1.5" strokeDasharray="4 3"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                  />
                  <motion.line
                    x1="120" y1="48" x2="190" y2="28"
                    stroke="currentColor"
                    className="text-gray-300 dark:text-neutral-600"
                    strokeWidth="1" strokeDasharray="3 3"
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                  />
                </svg>
              </div>

              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                Your graph is empty
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
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
                  className="border-teal-200 dark:border-teal-800/50 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 gap-2"
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
            <div className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md rounded-lg border border-gray-200/60 dark:border-neutral-700/50 shadow-md px-3 py-1.5 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'}
              </span>
              <span className="text-gray-300 dark:text-neutral-600">|</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />
                {edges.length} {edges.length === 1 ? 'edge' : 'edges'}
              </span>
            </div>
          </motion.div>
        )}

        {/* ─── Node Inspector Panel ─── */}
        {!isLoading && (
          <NodeInspector
            selectedNodes={selectedNodes}
            edges={edges}
            allNodes={nodes}
            onEdit={handleNodeDoubleClick}
            onDelete={handleDeleteNode}
            onFocus={handleFocusNode}
          />
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border-t border-gray-200 dark:border-neutral-800 py-3 px-4 mt-auto">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <p>Knowledge Graph Builder &middot; Double-click nodes to edit &middot; Drag handles to connect</p>
          <p className="hidden sm:block">Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded text-[10px] font-mono">?</kbd> for shortcuts</p>
        </div>
      </footer>

      {/* ─── Clear Confirmation Dialog ─── */}
      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Clear Graph</DialogTitle>
            <DialogDescription>
              This will permanently remove all nodes and edges from both the canvas and the database. This action cannot be undone.
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

      {/* ─── Node Edit Dialog ─── */}
      <NodeEditDialog
        node={editingNode}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onNodeUpdated={handleNodeUpdated}
        onNodeDeleted={handleNodeDeleted}
      />

      {/* ─── Connection Dialog ─── */}
      <ConnectionDialog
        connection={connectionData}
        open={connectionDialogOpen}
        onOpenChange={handleConnectionDialogClose}
        onConfirm={handleConnectionConfirm}
      />

      {/* ─── Keyboard Shortcuts Dialog ─── */}
      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onOpenChange={setShortcutsDialogOpen}
      />
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
