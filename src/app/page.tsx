'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ReactFlowProvider, useEdgesState, useNodesState, useReactFlow, type Connection, type Edge } from '@xyflow/react';
import { Maximize, Minimize, Moon, Plus, RefreshCw, Sparkles, Sun, Trash2, Waypoints } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import GraphCanvas, {
  mapApiToReactFlow,
  type CustomNodeType,
  type NodeShape,
} from '@/components/graph/GraphCanvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  clearGraph,
  createEdge,
  createNode,
  deleteEdge,
  deleteNode,
  fetchGraph,
  processNLP,
  updateNodePositions,
} from '@/services/api';
import { getLayoutedElements } from '@/lib/layout';

const NODE_COLORS = ['#0d9488', '#2563eb', '#ea580c', '#16a34a', '#7c3aed', '#db2777'];

function sameIds(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function GraphWorkspace() {
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiWorking, setIsAiWorking] = useState(false);
  const [nodeLabel, setNodeLabel] = useState('');
  const [nodeEmoji, setNodeEmoji] = useState('');
  const [nodeColor, setNodeColor] = useState(NODE_COLORS[0]);
  const [sourceNodeId, setSourceNodeId] = useState('');
  const [targetNodeId, setTargetNodeId] = useState('');
  const [relationship, setRelationship] = useState('');
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [nodeShape, setNodeShape] = useState<NodeShape>('rectangle');
  const [aiPrompt, setAiPrompt] = useState('');
  const [lastCypher, setLastCypher] = useState('');
  const [mounted, setMounted] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const { fitView, getViewport, setViewport } = useReactFlow();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = mounted && resolvedTheme === 'dark';

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadGraph = useCallback(async () => {
    setIsLoading(true);
    try {
      const graph = await fetchGraph();
      const mapped = mapApiToReactFlow(graph);
      setNodes(mapped.nodes);
      setEdges(mapped.edges);
      setTimeout(() => {
        fitView({ padding: 0.25, duration: 250 });
      }, 100);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load graph');
    } finally {
      setIsLoading(false);
    }
  }, [fitView, setEdges, setNodes]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const sortedNodes = useMemo(
    () => [...nodes].sort((a, b) => a.data.label.localeCompare(b.data.label)),
    [nodes]
  );

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeIds[0]) || null,
    [nodes, selectedNodeIds]
  );

  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeIds[0]) || null,
    [edges, selectedEdgeIds]
  );

  const handleCreateNode = useCallback(async () => {
    if (!nodeLabel.trim()) return;
    try {
      await createNode({
        label: nodeLabel.trim(),
        emoji: nodeEmoji.trim() || undefined,
        color: nodeColor,
      });
      setNodeLabel('');
      setNodeEmoji('');
      await loadGraph();
      toast.success('Node created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create node');
    }
  }, [loadGraph, nodeColor, nodeEmoji, nodeLabel]);

  const handleCreateEdge = useCallback(async () => {
    if (!sourceNodeId || !targetNodeId || !relationship.trim()) return;
    try {
      await createEdge({
        sourceNodeId,
        targetNodeId,
        relationship: relationship.trim(),
      });
      setRelationship('');
      await loadGraph();
      toast.success('Edge created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create edge');
    }
  }, [loadGraph, relationship, sourceNodeId, targetNodeId]);

  const handleConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const label = window.prompt('Relationship label', 'related to');
      if (!label || !label.trim()) return;
      try {
        await createEdge({
          sourceNodeId: connection.source,
          targetNodeId: connection.target,
          relationship: label.trim(),
        });
        await loadGraph();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to create edge');
      }
    },
    [loadGraph]
  );

  const handleDeleteSelected = useCallback(async () => {
    try {
      if (selectedNode) {
        await deleteNode(selectedNode.id);
      } else if (selectedEdge) {
        await deleteEdge(selectedEdge.id);
      } else {
        return;
      }
      await loadGraph();
      setSelectedNodeIds([]);
      setSelectedEdgeIds([]);
      toast.success('Selection deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete selection');
    }
  }, [loadGraph, selectedEdge, selectedNode]);

  const handleClear = useCallback(async () => {
    try {
      await clearGraph();
      await loadGraph();
      setSelectedNodeIds([]);
      setSelectedEdgeIds([]);
      toast.success('Graph cleared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear graph');
    }
  }, [loadGraph]);

  const handleAiGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setIsAiWorking(true);
    try {
      const result = await processNLP(aiPrompt.trim());
      setLastCypher(result.cypher || '');
      const mapped = mapApiToReactFlow({
        nodes: result.nodes,
        edges: result.edges,
      });
      const layouted = getLayoutedElements(mapped.nodes, mapped.edges, 'LR');
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
      await updateNodePositions(
        layouted.nodes.map((node) => ({
          id: node.id,
          posX: node.position.x,
          posY: node.position.y,
        }))
      );
      setAiPrompt('');
      setTimeout(() => {
        fitView({ padding: 0.28, duration: 280 });
      }, 100);
      toast.success(result.message || 'Graph updated with AI');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI generation failed');
    } finally {
      setIsAiWorking(false);
    }
  }, [aiPrompt, fitView, setEdges, setNodes]);

  const handleFitGraphTop = useCallback(() => {
    fitView({ padding: 0.18, duration: 250 });
    setTimeout(() => {
      const viewport = getViewport();
      setViewport(
        {
          x: viewport.x,
          y: viewport.y - 120,
          zoom: viewport.zoom,
        },
        { duration: 180 }
      );
    }, 280);
  }, [fitView, getViewport, setViewport]);

  return (
    <div className={`${isDark ? 'bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.12),_transparent_35%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-slate-100' : 'bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.12),_transparent_40%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-slate-900'} min-h-screen`}>
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 p-6">
        {!focusMode ? (
        <header className={`${isDark ? 'border-neutral-800 bg-neutral-900/80 shadow-black/30' : 'border-white/60 bg-white/80 shadow-slate-200/50'} flex flex-wrap items-center justify-between gap-4 rounded-3xl border px-6 py-5 shadow-lg backdrop-blur`}>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center">
              <Image src="/logo.svg" alt="AuraDB Logo" width={36} height={36} className="h-9 w-9" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">AuraDB Knowledge Graph</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className={`${isDark ? 'border-neutral-700 bg-neutral-950/80' : 'border-slate-200 bg-white'} flex items-center rounded-full border p-1`}>
              <Button
                variant={!isDark ? 'default' : 'ghost'}
                size="sm"
                className={!isDark ? 'bg-slate-900 text-white hover:bg-slate-800' : ''}
                onClick={() => setTheme('light')}
              >
                <Sun className="size-4" />
              </Button>
              <Button
                variant={isDark ? 'default' : 'ghost'}
                size="sm"
                className={isDark ? 'bg-slate-100 text-slate-900 hover:bg-slate-200' : ''}
                onClick={() => setTheme('dark')}
              >
                <Moon className="size-4" />
              </Button>
            </div>
            <div className={`${isDark ? 'border-neutral-700 bg-neutral-950/80' : 'border-slate-200 bg-white'} flex items-center rounded-full border p-1`}>
              <Button
                variant={nodeShape === 'rectangle' ? 'default' : 'ghost'}
                size="sm"
                className={nodeShape === 'rectangle' ? 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200' : ''}
                onClick={() => setNodeShape('rectangle')}
              >
                Rect
              </Button>
              <Button
                variant={nodeShape === 'circle' ? 'default' : 'ghost'}
                size="sm"
                className={nodeShape === 'circle' ? 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200' : ''}
                onClick={() => setNodeShape('circle')}
              >
                Circle
              </Button>
            </div>
            <Button variant="outline" onClick={() => loadGraph()} className="gap-2">
              <RefreshCw className="size-4" />
              Reload
            </Button>
            <Button variant="outline" onClick={handleFitGraphTop}>
              Fit Graph
            </Button>
            <Button variant="outline" onClick={() => setFocusMode(true)} className="gap-2">
              <Maximize className="size-4" />
              Focus
            </Button>
            <Button variant="destructive" onClick={handleClear} className="gap-2">
              <Trash2 className="size-4" />
              Clear
            </Button>
          </div>
        </header>
        ) : null}

        <div className={`${focusMode ? 'flex-1' : 'grid flex-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]'}`}>
          {!focusMode ? (
          <aside className="space-y-6">
            <section className={`${isDark ? 'border-neutral-800 bg-neutral-900/80 shadow-black/30' : 'border-white/60 bg-white/85 shadow-slate-200/50'} rounded-3xl border p-5 shadow-lg backdrop-blur`}>
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="size-4 text-teal-600" />
                <h2 className="font-semibold">NLP to Cypher</h2>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="ai-prompt">Prompt</Label>
                  <textarea
                    id="ai-prompt"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Describe the graph you want, for example: Create a founder-investor network for OpenAI and Microsoft."
                    className={`${isDark ? 'border-neutral-700 bg-neutral-950 text-slate-100' : 'border-slate-200 bg-white text-slate-900'} min-h-28 w-full rounded-xl border px-3 py-2 text-sm outline-none ring-0 focus:border-teal-400`}
                  />
                </div>
                <Button className="w-full gap-2 bg-teal-600 hover:bg-teal-700" onClick={handleAiGenerate} disabled={isAiWorking || !aiPrompt.trim()}>
                  <Sparkles className="size-4" />
                  {isAiWorking ? 'Generating...' : 'Generate and Apply'}
                </Button>
                {lastCypher ? (
                  <div className="rounded-2xl bg-slate-950 p-4 text-xs text-slate-200">
                    <div className="mb-2 font-semibold text-slate-400">Last Cypher</div>
                    <pre className="whitespace-pre-wrap break-words">{lastCypher}</pre>
                  </div>
                ) : null}
              </div>
            </section>

            <section className={`${isDark ? 'border-neutral-800 bg-neutral-900/80 shadow-black/30' : 'border-white/60 bg-white/85 shadow-slate-200/50'} rounded-3xl border p-5 shadow-lg backdrop-blur`}>
              <div className="mb-4 flex items-center gap-2">
                <Plus className="size-4 text-teal-600" />
                <h2 className="font-semibold">Add Node</h2>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="node-label">Label</Label>
                  <Input id="node-label" value={nodeLabel} onChange={(e) => setNodeLabel(e.target.value)} placeholder="Person, company, topic..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="node-emoji">Emoji</Label>
                  <Input id="node-emoji" value={nodeEmoji} onChange={(e) => setNodeEmoji(e.target.value)} placeholder="Optional, e.g. 🚀" maxLength={4} />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {NODE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNodeColor(color)}
                        className={`h-8 w-8 rounded-full border-2 ${nodeColor === color ? 'border-slate-900' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select ${color}`}
                      />
                    ))}
                  </div>
                </div>
                <Button className="w-full gap-2 bg-teal-600 hover:bg-teal-700" onClick={handleCreateNode}>
                  <Plus className="size-4" />
                  Create Node
                </Button>
              </div>
            </section>

            <section className={`${isDark ? 'border-neutral-800 bg-neutral-900/80 shadow-black/30' : 'border-white/60 bg-white/85 shadow-slate-200/50'} rounded-3xl border p-5 shadow-lg backdrop-blur`}>
              <div className="mb-4 flex items-center gap-2">
                <Waypoints className="size-4 text-teal-600" />
                <h2 className="font-semibold">Connect Nodes</h2>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="source-node">Source</Label>
                  <select
                    id="source-node"
                    value={sourceNodeId}
                    onChange={(e) => setSourceNodeId(e.target.value)}
                    className={`${isDark ? 'border-neutral-700 bg-neutral-950 text-slate-100' : 'border-slate-200 bg-white text-slate-900'} h-10 w-full rounded-md border px-3 text-sm`}
                  >
                    <option value="">Select source node</option>
                    {sortedNodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.data.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target-node">Target</Label>
                  <select
                    id="target-node"
                    value={targetNodeId}
                    onChange={(e) => setTargetNodeId(e.target.value)}
                    className={`${isDark ? 'border-neutral-700 bg-neutral-950 text-slate-100' : 'border-slate-200 bg-white text-slate-900'} h-10 w-full rounded-md border px-3 text-sm`}
                  >
                    <option value="">Select target node</option>
                    {sortedNodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.data.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relationship">Relationship</Label>
                  <Input
                    id="relationship"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    placeholder="owns, knows, depends on..."
                  />
                </div>
                <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white" onClick={handleCreateEdge}>
                  Create Edge
                </Button>
              </div>
            </section>

            <section className={`${isDark ? 'border-neutral-800 bg-neutral-900/80 shadow-black/30' : 'border-white/60 bg-white/85 shadow-slate-200/50'} rounded-3xl border p-5 shadow-lg backdrop-blur`}>
              <h2 className="font-semibold">Graph Summary</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className={`${isDark ? 'bg-neutral-800' : 'bg-slate-100'} rounded-2xl p-3`}>
                  <div className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-xs uppercase tracking-wide`}>Nodes</div>
                  <div className="mt-1 text-2xl font-semibold">{nodes.length}</div>
                </div>
                <div className={`${isDark ? 'bg-neutral-800' : 'bg-slate-100'} rounded-2xl p-3`}>
                  <div className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-xs uppercase tracking-wide`}>Edges</div>
                  <div className="mt-1 text-2xl font-semibold">{edges.length}</div>
                </div>
              </div>
              <div className={`${isDark ? 'bg-neutral-800 text-slate-300' : 'bg-slate-100 text-slate-600'} mt-4 rounded-2xl p-4 text-sm`}>
                {selectedNode ? `Selected node: ${selectedNode.data.label}` : selectedEdge ? `Selected edge: ${selectedEdge.label || 'unnamed'}` : 'Select a node or edge on the canvas to inspect it.'}
              </div>
              <Button variant="outline" className="mt-4 w-full" onClick={handleDeleteSelected} disabled={!selectedNode && !selectedEdge}>
                Delete Selection
              </Button>
            </section>
          </aside>
          ) : null}

          <main className={`${focusMode ? 'fixed inset-0 z-50 min-h-screen bg-black/70 p-4' : 'min-h-[720px]'}`}>
            {focusMode ? (
              <div className="pointer-events-none absolute right-6 top-6 z-50">
                <Button
                  variant="outline"
                  className="pointer-events-auto gap-2 border-white/20 bg-black/60 text-white hover:bg-black/80"
                  onClick={() => setFocusMode(false)}
                >
                  <Minimize className="size-4" />
                  Exit Focus
                </Button>
              </div>
            ) : null}
            {isLoading ? (
              <div className={`${isDark ? 'border-neutral-800 bg-neutral-900/80 shadow-black/30' : 'border-white/60 bg-white/80 shadow-slate-200/50'} flex h-full min-h-[720px] items-center justify-center rounded-3xl border shadow-lg backdrop-blur`}>
                <div className="text-center">
                  <RefreshCw className="mx-auto size-8 animate-spin text-teal-600" />
                  <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} mt-4 text-sm`}>Loading graph...</p>
                </div>
              </div>
            ) : (
              <div className={focusMode ? 'h-[calc(100vh-2rem)]' : 'h-[720px]'}>
                <GraphCanvas
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnectNew={handleConnect}
                  nodeShape={nodeShape}
                  surfaceTheme={isDark ? 'dark' : 'light'}
                  onSelectionChange={({ nodes: selectedNodes = [], edges: selectedEdges = [] }) => {
                    const nextNodeIds = selectedNodes.map((node) => node.id);
                    const nextEdgeIds = selectedEdges.map((edge) => edge.id);
                    setSelectedNodeIds((current) => (sameIds(current, nextNodeIds) ? current : nextNodeIds));
                    setSelectedEdgeIds((current) => (sameIds(current, nextEdgeIds) ? current : nextEdgeIds));
                  }}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ReactFlowProvider>
      <GraphWorkspace />
    </ReactFlowProvider>
  );
}
