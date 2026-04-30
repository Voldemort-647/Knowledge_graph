'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Download, FileJson, FileSpreadsheet, ChevronDown, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Node, Edge } from '@xyflow/react';
import { importGraph } from '@/services/api';

interface ExportButtonProps {
  nodes: Node[];
  edges: Edge[];
  onGraphUpdated?: () => void;
}

export default function ExportButton({ nodes, edges, onGraphUpdated }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadFile = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const exportJSON = useCallback(() => {
    setIsExporting(true);
    try {
      const graphData = {
        exportedAt: new Date().toISOString(),
        nodes: nodes.map((n) => ({
          id: n.id,
          label: (n.data as Record<string, string>).label || '',
          imageUrl: (n.data as Record<string, string>).imageUrl || null,
          color: (n.data as Record<string, string>).color || '#0d9488',
          position: n.position,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label || null,
        })),
      };
      downloadFile(
        JSON.stringify(graphData, null, 2),
        'knowledge-graph.json',
        'application/json'
      );
      toast.success('Graph exported as JSON');
    } catch {
      toast.error('Failed to export graph');
    } finally {
      setIsExporting(false);
    }
  }, [nodes, edges, downloadFile]);

  const exportCSV = useCallback(() => {
    setIsExporting(true);
    try {
      // Nodes CSV
      const nodesHeader = 'id,label,imageUrl,color,positionX,positionY\n';
      const nodesRows = nodes
        .map((n) => {
          const data = n.data as Record<string, string>;
          return [
            n.id,
            `"${(data.label || '').replace(/"/g, '""')}"`,
            data.imageUrl || '',
            data.color || '#0d9488',
            Math.round(n.position.x),
            Math.round(n.position.y),
          ].join(',');
        })
        .join('\n');

      // Edges CSV
      const edgesHeader = 'id,source,target,relationship\n';
      const edgesRows = edges
        .map((e) => {
          return [
            e.id,
            e.source,
            e.target,
            `"${(e.label || '').replace(/"/g, '""')}"`,
          ].join(',');
        })
        .join('\n');

      const combinedCSV = `# Nodes\n${nodesHeader}${nodesRows}\n\n# Edges\n${edgesHeader}${edgesRows}`;
      downloadFile(combinedCSV, 'knowledge-graph.csv', 'text/csv');
      toast.success('Graph exported as CSV');
    } catch {
      toast.error('Failed to export graph');
    } finally {
      setIsExporting(false);
    }
  }, [nodes, edges, downloadFile]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.name.endsWith('.json')) {
        toast.error('Please select a JSON file');
        return;
      }

      setIsImporting(true);
      try {
        const text = await file.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          toast.error('Invalid JSON file');
          return;
        }

        const data = parsed as Record<string, unknown>;

        // Support both raw export format and simplified format
        let importNodes: Array<{ label: string; imageUrl?: string | null; color?: string; position?: { x: number; y: number } }>;
        let importEdges: Array<{ source: string; target: string; label?: string }>;

        if (Array.isArray(data.nodes)) {
          // Simplified format: { nodes: [...], edges: [...] }
          importNodes = (data.nodes as Array<Record<string, unknown>>).map((n) => ({
            label: String(n.label || ''),
            imageUrl: typeof n.imageUrl === 'string' ? n.imageUrl : null,
            color: typeof n.color === 'string' ? n.color : '#0d9488',
            position: typeof n.position === 'object' && n.position !== null
              ? n.position as { x: number; y: number }
              : undefined,
          }));
          importEdges = Array.isArray(data.edges)
            ? (data.edges as Array<Record<string, unknown>>).map((e) => ({
                source: String(e.source || ''),
                target: String(e.target || ''),
                label: typeof e.label === 'string' ? e.label : undefined,
              }))
            : [];
        } else {
          toast.error('Invalid graph format: expected { nodes: [...], edges: [...] }');
          return;
        }

        if (importNodes.length === 0) {
          toast.error('No nodes found in the file');
          return;
        }

        const result = await importGraph({ nodes: importNodes, edges: importEdges });
        toast.success(result.message || 'Graph imported successfully!');
        onGraphUpdated?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to import graph';
        toast.error(message);
      } finally {
        setIsImporting(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [onGraphUpdated]
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-teal-200 dark:border-teal-800/50 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-800 dark:hover:text-teal-300 shadow-sm"
            disabled={isExporting || isImporting}
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={exportJSON} className="gap-2 cursor-pointer" disabled={isExporting}>
            <FileJson className="size-4 text-teal-500" />
            Export as JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportCSV} className="gap-2 cursor-pointer" disabled={isExporting}>
            <FileSpreadsheet className="size-4 text-emerald-500" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleImportClick} className="gap-2 cursor-pointer" disabled={isImporting}>
            <Upload className="size-4 text-amber-500" />
            {isImporting ? 'Importing...' : 'Import from JSON'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden file input for JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
