'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Edge,
  type ReactFlowInstance,
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
  LayoutGrid,
  Undo2,
  Redo2,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  Shapes,
  LayoutTemplate,
  ZoomOut,
  Map,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import GraphCanvas, {
  mapApiToReactFlow,
  type CustomNodeType,
} from '@/components/graph/GraphCanvas';
import SelectionInfoBar from '@/components/graph/SelectionInfoBar';
import NodeForm from '@/components/graph/NodeForm';
import EdgeForm from '@/components/graph/EdgeForm';
import NodeEditDialog from '@/components/graph/NodeEditDialog';
import ConnectionDialog from '@/components/graph/ConnectionDialog';
import SearchPanel from '@/components/graph/SearchPanel';
import StatsPanel from '@/components/graph/StatsPanel';
import ExportButton from '@/components/graph/ExportButton';
import KeyboardShortcutsDialog from '@/components/graph/KeyboardShortcutsDialog';
import NodeInspector from '@/components/graph/NodeInspector';
import EdgeContextMenu from '@/components/graph/EdgeContextMenu';
import type { EdgeStyleData } from '@/components/graph/EdgeStylePicker';
import PromptInput from '@/components/graph/PromptInput';
import NodePalette from '@/components/graph/NodePalette';
import DropZone from '@/components/graph/DropZone';
import TemplateDialog from '@/components/graph/TemplateDialog';
import ShareButton, { ImportFromUrlDialog } from '@/components/graph/ShareButton';
import OnboardingTutorial from '@/components/graph/OnboardingTutorial';
import {
  fetchGraph,
  deleteNode as apiDeleteNode,
  deleteEdge as apiDeleteEdge,
  createEdge,
  updateEdge,
  clearGraph,
  type NLPResponse,
} from '@/services/api';
import { getLayoutedElements, type LayoutDirection } from '@/lib/layout';
import { useGraphHistory } from '@/store/graph-history';
import { GRAPH_TEMPLATES } from '@/lib/templates';
import {
  getSharedGraphFromCurrentUrl,
  clearSharedHash,
  type SharedGraphData,
} from '@/lib/graph-sharing';
import { useGroupStore } from '@/store/group-store';
import { useOnboardingStore } from '@/store/onboarding-store';
import {
  getNextGroupColor,
  generateGroupLabel,
} from '@/lib/groups';

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
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nodeFormOpen, setNodeFormOpen] = useState(false);
  const [edgeFormOpen, setEdgeFormOpen] = useState(false);
  const [nlpExpanded, setNlpExpanded] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('LR');

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

  // Feature 1: Palette state
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Feature 2: Template dialog state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  // URL sharing state
  const [sharedGraphData, setSharedGraphData] = useState<SharedGraphData | null>(null);
  const [importUrlDialogOpen, setImportUrlDialogOpen] = useState(false);

  // Feature 5: Zoom level state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showMiniMap, setShowMiniMap] = useState(true);

  // React Flow instance ref for drop zone
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  // Edge context menu state
  const [edgeContextMenu, setEdgeContextMenu] = useState<{
    edge: Edge;
    position: { x: number; y: number };
  } | null>(null);

  // Undo/redo history
  const {
    pushSnapshot,
    undo: historyUndo,
    redo: historyRedo,
    canUndo: historyCanUndo,
    canRedo: historyCanRedo,
    clearHistory,
  } = useGraphHistory();

  // Empty state parallax ref
  const emptyStateRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const { fitView, setCenter, getNodes, screenToFlowPosition } = useReactFlow();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Compute selected nodes/edges from React Flow state
  const selectedNodes = useMemo(
    () => nodes.filter((n) => n.selected),
    [nodes]
  );
  const selectedEdges = useMemo(
    () => edges.filter((e) => e.selected),
    [edges]
  );
  const selectedNodeCount = selectedNodes.length;
  const selectedEdgeCount = selectedEdges.length;
  const showSelectionBar = selectedNodeCount + selectedEdgeCount >= 2;

  // Group store
  const { groups, addGroup } = useGroupStore();

  // Onboarding: auto-start on first visit
  const { hasCompletedOnboarding, startOnboarding } = useOnboardingStore();
  useEffect(() => {
    if (!hasCompletedOnboarding) {
      const timer = setTimeout(() => {
        startOnboarding();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, startOnboarding]);

  // Push snapshot helper
  const pushCurrentSnapshot = useCallback(() => {
    pushSnapshot({ nodes: [...nodes], edges: [...edges] });
  }, [nodes, edges, pushSnapshot]);

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

  // Check for shared graph in URL hash on mount
  useEffect(() => {
    const sharedData = getSharedGraphFromCurrentUrl();
    if (sharedData && sharedData.nodes.length > 0) {
      setSharedGraphData(sharedData);
      // Small delay so the page loads first
      const timer = setTimeout(() => {
        setImportUrlDialogOpen(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Handle import from shared URL
  const handleImportFromUrl = useCallback(async () => {
    clearSharedHash();
    setSharedGraphData(null);
    await loadGraph();
  }, [loadGraph]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  // Handle node deletion
  const handleDeleteNode = useCallback(
    async (id: string) => {
      pushCurrentSnapshot();
      try {
        await apiDeleteNode(id);
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      } catch {
        toast.error('Failed to delete node');
      }
    },
    [setNodes, setEdges, pushCurrentSnapshot]
  );

  // Handle edge deletion
  const handleDeleteEdge = useCallback(
    async (id: string) => {
      pushCurrentSnapshot();
      try {
        await apiDeleteEdge(id);
        setEdges((eds) => eds.filter((e) => e.id !== id));
      } catch {
        toast.error('Failed to delete edge');
      }
    },
    [setEdges, pushCurrentSnapshot]
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
      pushCurrentSnapshot();
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
    [connectionData, loadGraph, pushCurrentSnapshot]
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
      pushCurrentSnapshot();
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [setNodes, setEdges, pushCurrentSnapshot]
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
      pushCurrentSnapshot();
      const { nodes: rfNodes, edges: rfEdges } = mapApiToReactFlow({
        nodes: data.nodes,
        edges: data.edges,
      });
      setNodes(rfNodes);
      setEdges(rfEdges);
    },
    [setNodes, setEdges, pushCurrentSnapshot]
  );

  // Handle node drag end → push snapshot
  const handleNodesChangeWrapper = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
      // Detect position changes (drag end) to push history
      const positionChanges = changes.filter(
        (c) => c.type === 'position' && c.dragging === false
      );
      if (positionChanges.length > 0) {
        // Push snapshot on next tick so we have the latest positions
        setTimeout(() => {
          pushSnapshot({ nodes: [...getNodes() as CustomNodeType[]], edges: [...edges] });
        }, 50);
      }
    },
    [onNodesChange, edges, pushSnapshot, getNodes]
  );

  // Auto-layout handler
  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;
    pushCurrentSnapshot();
    const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges, layoutDirection);
    setNodes(layoutedNodes);
    // Fit view after layout
    setTimeout(() => {
      fitView({ padding: 0.3, duration: 400 });
    }, 50);
    toast.success(`Graph auto-layout applied (${layoutDirection})`);
  }, [nodes, edges, layoutDirection, setNodes, fitView, pushCurrentSnapshot]);

  // Undo handler
  const handleUndo = useCallback(() => {
    const snapshot = historyUndo();
    if (snapshot) {
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
    }
  }, [historyUndo, setNodes, setEdges]);

  // Redo handler
  const handleRedo = useCallback(() => {
    const snapshot = historyRedo();
    if (snapshot) {
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
    }
  }, [historyRedo, setNodes, setEdges]);

  // Edge context menu handlers
  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      setEdgeContextMenu({
        edge,
        position: { x: event.clientX, y: event.clientY },
      });
    },
    []
  );

  const handleEdgeLabelEdit = useCallback(
    async (edgeId: string, newLabel: string) => {
      pushCurrentSnapshot();
      try {
        await updateEdge({ id: edgeId, relationship: newLabel });
        // Update edge label in local state
        setEdges((eds) =>
          eds.map((e) =>
            e.id === edgeId
              ? { ...e, label: newLabel }
              : e
          )
        );
        toast.success('Edge label updated');
      } catch {
        toast.error('Failed to update edge label');
      }
    },
    [setEdges, pushCurrentSnapshot]
  );

  const handleEdgeDelete = useCallback(
    async (edgeId: string) => {
      pushCurrentSnapshot();
      try {
        await apiDeleteEdge(edgeId);
        setEdges((eds) => eds.filter((e) => e.id !== edgeId));
        toast.success('Edge deleted');
      } catch {
        toast.error('Failed to delete edge');
      }
    },
    [setEdges, pushCurrentSnapshot]
  );

  // Handle edge style change from context menu
  const handleEdgeStyleChange = useCallback(
    async (edgeId: string, styleData: EdgeStyleData) => {
      pushCurrentSnapshot();
      try {
        await updateEdge({
          id: edgeId,
          edgeType: styleData.edgeType,
          animated: styleData.animated,
          lineStyle: styleData.lineStyle,
          thickness: styleData.thickness,
        });
        // Update edge visually in local state
        const dashArray =
          styleData.lineStyle === 'dashed'
            ? '8 4'
            : styleData.lineStyle === 'dotted'
              ? '2 4'
              : undefined;
        setEdges((eds) =>
          eds.map((e) =>
            e.id === edgeId
              ? {
                  ...e,
                  type: styleData.edgeType,
                  animated: styleData.animated,
                  style: {
                    stroke: '#0d9488',
                    strokeWidth: styleData.thickness,
                    ...(dashArray ? { strokeDasharray: dashArray } : {}),
                  },
                  data: {
                    ...e.data,
                    edgeType: styleData.edgeType,
                    lineStyle: styleData.lineStyle,
                    thickness: styleData.thickness,
                  },
                }
              : e
          )
        );
        toast.success('Edge style updated');
      } catch {
        toast.error('Failed to update edge style');
      }
    },
    [setEdges, pushCurrentSnapshot]
  );

  const closeEdgeContextMenu = useCallback(() => {
    setEdgeContextMenu(null);
  }, []);

  // Feature 1: Handle React Flow init
  const handleGraphCanvasInit = useCallback((instance: ReactFlowInstance) => {
    rfInstanceRef.current = instance;
  }, []);

  // Feature 5: Handle viewport move → update zoom
  const handleViewportMove = useCallback((zoom: number) => {
    setZoomLevel(zoom);
  }, []);

  // Feature 1: Handle drop from palette
  const handleDropNode = useCallback(
    async (data: { type: string; label: string; color: string; position: { x: number; y: number } }) => {
      try {
        const response = await fetch('/api/nodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: data.label,
            color: data.color,
            posX: data.position.x,
            posY: data.position.y,
          }),
        });
        if (!response.ok) throw new Error('Failed to create node');
        const newNode = await response.json();
        toast.success(`Created "${data.label}" node`);
        await loadGraph();
      } catch {
        toast.error('Failed to create node from palette');
      }
    },
    [loadGraph]
  );

  // Feature 2: Handle quick template load from empty state
  const handleQuickTemplateLoad = useCallback(
    async (templateId: string) => {
      const template = GRAPH_TEMPLATES.find((t) => t.id === templateId);
      if (!template) return;
      try {
        const { importGraph } = await import('@/services/api');
        const result = await importGraph({
          nodes: template.nodes.map((n) => ({
            label: n.label,
            color: n.color,
            position: n.position,
          })),
          edges: template.edges.map((e) => ({
            source: e.source,
            target: e.target,
            label: e.label,
          })),
        });
        toast.success(result.message || `Template "${template.name}" loaded!`);
        await loadGraph();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load template');
      }
    },
    [loadGraph]
  );

  // Empty state parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (nodes.length > 0 || isLoading) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [nodes.length, isLoading]);

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
        // Close edge context menu first
        if (edgeContextMenu) {
          closeEdgeContextMenu();
          return;
        }
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

      // Ctrl+Z — undo
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl+Shift+Z — redo
      if (e.ctrlKey && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // L — auto layout
      if (e.key === 'l' && !isTyping && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleAutoLayout();
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
  }, [nodes, edges, handleDeleteNode, handleDeleteEdge, setNodes, setEdges, handleUndo, handleRedo, handleAutoLayout, edgeContextMenu, closeEdgeContextMenu]);

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

  // Batch delete selected nodes and edges
  const handleBatchDelete = useCallback(async () => {
    const selNodes = nodes.filter((n) => n.selected);
    const selEdges = edges.filter((e) => e.selected);
    if (selNodes.length === 0 && selEdges.length === 0) return;

    pushCurrentSnapshot();
    try {
      // Delete all selected nodes (and their connected edges)
      await Promise.allSettled(selNodes.map((n) => apiDeleteNode(n.id)));
      // Delete selected edges that weren't already removed by node deletion
      const deletedNodeIds = new Set(selNodes.map((n) => n.id));
      const remainingSelEdges = selEdges.filter(
        (e) => !deletedNodeIds.has(e.source) && !deletedNodeIds.has(e.target)
      );
      await Promise.allSettled(remainingSelEdges.map((e) => apiDeleteEdge(e.id)));

      // Update local state
      setNodes((nds) => nds.filter((n) => !n.selected));
      setEdges((eds) => eds.filter((e) => !e.selected && !deletedNodeIds.has(e.source) && !deletedNodeIds.has(e.target)));

      toast.success(`Deleted ${selNodes.length} node${selNodes.length !== 1 ? 's' : ''} and ${selEdges.length} edge${selEdges.length !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Failed to delete some items');
    }
  }, [nodes, edges, setNodes, setEdges, pushCurrentSnapshot]);

  // Deselect all nodes and edges
  const handleDeselectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
    setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
  }, [setNodes, setEdges]);

  // Group selected nodes
  const handleGroupSelection = useCallback(() => {
    const selNodes = nodes.filter((n) => n.selected);
    if (selNodes.length < 2) return;

    const usedColors = Object.values(groups).map((g) => g.color);
    const existingLabels = Object.values(groups).map((g) => g.label);
    const color = getNextGroupColor(usedColors);
    const label = generateGroupLabel(selNodes.length, existingLabels);
    const nodeIds = selNodes.map((n) => n.id);

    addGroup(nodeIds, label, color);
    handleDeselectAll();
    toast.success(`Created group "${label}" with ${selNodes.length} nodes`);
  }, [nodes, groups, addGroup, handleDeselectAll]);

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
    pushCurrentSnapshot();
    try {
      await clearGraph();
      setNodes([]);
      setEdges([]);
      clearHistory();
      setClearConfirmOpen(false);
      toast.success('Graph cleared successfully');
    } catch {
      toast.error('Failed to clear graph from database');
      setNodes([]);
      setEdges([]);
      setClearConfirmOpen(false);
    }
  }, [setNodes, setEdges, clearHistory, pushCurrentSnapshot]);

  // Layout direction icons
  const layoutDirIcons: Record<LayoutDirection, typeof ArrowRight> = {
    LR: ArrowRight,
    RL: ArrowLeft,
    TB: ArrowDown,
    BT: ArrowUp,
  };

  const layoutDirLabels: Record<LayoutDirection, string> = {
    LR: 'Left to Right',
    RL: 'Right to Left',
    TB: 'Top to Bottom',
    BT: 'Bottom to Top',
  };

  const canUndo = historyCanUndo();
  const canRedo = historyCanRedo();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-stone-50 to-gray-100 dark:from-neutral-950 dark:via-[#0f1419] dark:to-neutral-950">
      {/* ─── Header ─── */}
      <header className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-gray-200 dark:border-neutral-800 sticky top-0 z-30 transition-shadow duration-300 hover:shadow-md">
        {/* Animated gradient underline beneath header */}
        <div className="absolute bottom-0 left-0 right-0 animated-teal-line opacity-40" />
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-sm">
              <Network className="size-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight gradient-underline inline-block">
                Knowledge Graph Builder
              </h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                Visualize entities and relationships
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Share button */}
            <ShareButton nodes={nodes} edges={edges} onGraphUpdated={loadGraph} />

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
          <DropZone
            onDropNode={handleDropNode}
            screenToFlowPosition={screenToFlowPosition}
          >
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChangeWrapper}
              onEdgesChange={onEdgesChange}
              onDeleteNode={handleDeleteNode}
              onDeleteEdge={handleDeleteEdge}
              onConnectNew={handleConnect}
              onNodeDoubleClick={handleNodeDoubleClick}
              onEdgeContextMenu={handleEdgeContextMenu}
              onInit={handleGraphCanvasInit}
              onMove={handleViewportMove}
              showMiniMap={showMiniMap}
            />

            {/* ─── Selection Info Bar ─── */}
            <AnimatePresence>
              {showSelectionBar && (
                <SelectionInfoBar
                  selectedNodeCount={selectedNodeCount}
                  selectedEdgeCount={selectedEdgeCount}
                  onBatchDelete={handleBatchDelete}
                  onGroupSelection={handleGroupSelection}
                  onDeselectAll={handleDeselectAll}
                />
              )}
            </AnimatePresence>
          </DropZone>
        )}

        {/* ─── Edge Context Menu ─── */}
        <EdgeContextMenu
          key={edgeContextMenu?.edge?.id || 'none'}
          edge={edgeContextMenu?.edge || null}
          position={edgeContextMenu?.position || { x: 0, y: 0 }}
          visible={!!edgeContextMenu}
          onEdit={handleEdgeLabelEdit}
          onStyleChange={handleEdgeStyleChange}
          onDelete={handleEdgeDelete}
          onClose={closeEdgeContextMenu}
        />

        {/* ─── Node Palette (Feature 1) ─── */}
        {!isLoading && (
          <NodePalette isOpen={paletteOpen} onToggle={() => setPaletteOpen((p) => !p)} />
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
                {/* Undo */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="icon"
                        variant="outline"
                        className={`${toolbarBtnBase} ${canUndo ? toolbarBtnInactive : 'opacity-40 cursor-not-allowed'}`}
                        onClick={handleUndo}
                        disabled={!canUndo}
                      >
                        <Undo2 className="size-4" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="left">Undo (Ctrl+Z)</TooltipContent>
                </Tooltip>

                {/* Redo */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="icon"
                        variant="outline"
                        className={`${toolbarBtnBase} ${canRedo ? toolbarBtnInactive : 'opacity-40 cursor-not-allowed'}`}
                        onClick={handleRedo}
                        disabled={!canRedo}
                      >
                        <Redo2 className="size-4" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="left">Redo (Ctrl+Shift+Z)</TooltipContent>
                </Tooltip>

                {/* Auto Layout */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="icon"
                        variant="outline"
                        className={`${toolbarBtnBase} ${toolbarBtnInactive}`}
                        onClick={handleAutoLayout}
                        disabled={nodes.length === 0}
                      >
                        <LayoutGrid className="size-4" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="left">Auto Layout (L)</TooltipContent>
                </Tooltip>

                {/* Layout Direction Dropdown */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            className={`${toolbarBtnBase} ${toolbarBtnInactive}`}
                            disabled={nodes.length === 0}
                          >
                            {(() => {
                              const DirIcon = layoutDirIcons[layoutDirection];
                              return <DirIcon className="size-4" />;
                            })()}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {(Object.keys(layoutDirLabels) as LayoutDirection[]).map((dir) => {
                            const DirIcon = layoutDirIcons[dir];
                            return (
                              <DropdownMenuItem
                                key={dir}
                                onClick={() => setLayoutDirection(dir)}
                                className={layoutDirection === dir ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300' : ''}
                              >
                                <DirIcon className="size-4 mr-2" />
                                {layoutDirLabels[dir]}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="left">Layout Direction</TooltipContent>
                </Tooltip>

                {/* Templates (Feature 2) */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="icon"
                        variant="outline"
                        className={`${toolbarBtnBase} ${toolbarBtnInactive}`}
                        onClick={() => setTemplateDialogOpen(true)}
                      >
                        <LayoutTemplate className="size-4" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="left">Templates</TooltipContent>
                </Tooltip>

                {/* Divider */}
                <div className="h-px bg-gray-200/60 dark:bg-neutral-700/40 mx-1.5" />

                {/* Palette (Feature 1) */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="icon"
                        variant="outline"
                        className={`${toolbarBtnBase} ${paletteOpen ? toolbarBtnActive : toolbarBtnInactive}`}
                        onClick={() => setPaletteOpen((p) => !p)}
                      >
                        <Shapes className="size-4" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="left">Node Palette</TooltipContent>
                </Tooltip>

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
            ref={emptyStateRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <div className="text-center space-y-4 max-w-md px-4">
              {/* Animated floating nodes illustration with parallax */}
              <div className="relative h-24 mx-auto max-w-[240px]">
                {/* Central node */}
                <motion.div
                  animate={{
                    y: [0, -8, 0],
                    x: mousePos.x * 3,
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg">
                    <Network className="size-7 text-white" />
                  </div>
                </motion.div>

                {/* Satellite node 1 */}
                <motion.div
                  animate={{
                    y: [0, -6, 0],
                    x: [0, 2, 0],
                  }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute left-2 top-1"
                  style={{
                    transform: `translate(${mousePos.x * -5}px, ${mousePos.y * -5}px)`,
                    transition: 'transform 0.3s ease-out',
                  }}
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-md">
                    <span className="text-[10px] font-bold text-white">A</span>
                  </div>
                </motion.div>

                {/* Satellite node 2 */}
                <motion.div
                  animate={{
                    y: [0, 6, 0],
                    x: [0, -2, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  className="absolute right-2 bottom-1"
                  style={{
                    transform: `translate(${mousePos.x * 6}px, ${mousePos.y * 4}px)`,
                    transition: 'transform 0.3s ease-out',
                  }}
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
                  style={{
                    transform: `translate(${mousePos.x * -4}px, ${mousePos.y * 6}px)`,
                    transition: 'transform 0.3s ease-out',
                  }}
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

              {/* Gradient text heading */}
              <h2 className="text-lg font-semibold gradient-text">
                Your graph is empty
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Add nodes by dragging from the palette, or start with a template.
              </p>
              <div className="flex gap-2 justify-center pointer-events-auto flex-wrap">
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
                  className="border-teal-200 dark:border-teal-800/50 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 gap-2 pulse-glow"
                  onClick={() => setNlpExpanded(true)}
                >
                  <ZoomIn className="size-4" />
                  Try AI
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-200 dark:border-neutral-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800/40 gap-2"
                  onClick={() => setTemplateDialogOpen(true)}
                >
                  <LayoutTemplate className="size-4" />
                  Load Template
                </Button>
              </div>

              {/* Quick Start section with template thumbnails */}
              <div className="pointer-events-auto pt-2">
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider font-medium">
                  Quick Start
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {GRAPH_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleQuickTemplateLoad(template.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/70 dark:bg-neutral-800/70 border border-gray-200/60 dark:border-neutral-700/50 shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                    >
                      <span className="text-sm">{template.icon}</span>
                      <span className="font-medium">{template.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Bottom Status Bar (Feature 4 & 5) ─── */}
        {!isLoading && nodes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute left-4 bottom-4 z-20"
          >
            <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-xl border border-gray-200/60 dark:border-neutral-700/50 shadow-lg px-4 py-2 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300 relative overflow-hidden">
              {/* Subtle animated teal line at top */}
              <div className="absolute top-0 left-0 right-0 animated-teal-line opacity-30" />
              {/* Node count with scale pop animation */}
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-sm shadow-teal-500/40" />
                <span key={nodes.length} className="font-semibold stat-number stat-number-animate">{nodes.length}</span>
                <span className="text-gray-400 dark:text-gray-500">{nodes.length === 1 ? 'node' : 'nodes'}</span>
              </div>

              {/* Separator */}
              <div className="w-px h-4 bg-gradient-to-b from-transparent via-gray-300 dark:via-neutral-600 to-transparent" />

              {/* Edge count */}
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-500" />
                <span key={edges.length} className="font-semibold stat-number stat-number-animate">{edges.length}</span>
                <span className="text-gray-400 dark:text-gray-500">{edges.length === 1 ? 'edge' : 'edges'}</span>
              </div>

              {/* Separator */}
              <div className="w-px h-4 bg-gradient-to-b from-transparent via-gray-300 dark:via-neutral-600 to-transparent" />

              {/* Zoom level (Feature 5) */}
              <div className="flex items-center gap-1.5">
                <ZoomOut className="size-3 text-gray-400 dark:text-gray-500" />
                <span className="font-semibold tabular-nums">{Math.round(zoomLevel * 100)}%</span>
              </div>

              {/* Separator */}
              <div className="w-px h-4 bg-gradient-to-b from-transparent via-gray-300 dark:via-neutral-600 to-transparent" />

              {/* Minimap toggle */}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowMiniMap((p) => !p)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg transition-all duration-200 ${showMiniMap ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/25 shadow-sm shadow-teal-500/10 dark:shadow-teal-400/5' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800'}`}
                    >
                      <Map className="size-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {showMiniMap ? 'Hide minimap' : 'Show minimap'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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

      {/* ─── Template Dialog (Feature 2) ─── */}
      <TemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        onGraphUpdated={loadGraph}
      />

      {/* ─── Import from Shared URL Dialog ─── */}
      <ImportFromUrlDialog
        open={importUrlDialogOpen}
        onOpenChange={setImportUrlDialogOpen}
        sharedData={sharedGraphData}
        onImported={handleImportFromUrl}
      />
      {/* ─── Onboarding Tutorial ─── */}
      <OnboardingTutorial />
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
