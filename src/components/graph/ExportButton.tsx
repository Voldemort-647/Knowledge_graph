'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Download, FileJson, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Node, Edge } from '@xyflow/react';

interface ExportButtonProps {
  nodes: Node[];
  edges: Edge[];
}

export default function ExportButton({ nodes, edges }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-2 border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800 shadow-sm"
          disabled={isExporting || (nodes.length === 0 && edges.length === 0)}
        >
          <Download className="size-4" />
          <span className="hidden sm:inline">Export</span>
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={exportJSON} className="gap-2 cursor-pointer">
          <FileJson className="size-4 text-teal-500" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportCSV} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="size-4 text-emerald-500" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
