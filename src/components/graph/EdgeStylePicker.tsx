'use client';

import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Spline,
  Route,
  Minus,
  ArrowRightLeft,
  Zap,
  ZapOff,
} from 'lucide-react';
import type { Edge } from '@xyflow/react';

/* ─── Types ─── */
export interface EdgeStyleData {
  edgeType: string;
  animated: boolean;
  lineStyle: string;
  thickness: number;
}

interface EdgeStylePickerProps {
  edge: Edge;
  currentStyle: EdgeStyleData;
  onStyleChange: (edgeId: string, style: EdgeStyleData) => void;
  children: React.ReactNode;
}

/* ─── Constants ─── */
const EDGE_TYPES = [
  { value: 'smoothstep', label: 'Smooth Step', icon: Spline },
  { value: 'bezier', label: 'Bezier', icon: Route },
  { value: 'straight', label: 'Straight', icon: Minus },
  { value: 'step', label: 'Step', icon: ArrowRightLeft },
] as const;

const LINE_STYLES = [
  { value: 'solid', label: 'Solid', dashArray: 'none' },
  { value: 'dashed', label: 'Dashed', dashArray: '8 4' },
  { value: 'dotted', label: 'Dotted', dashArray: '2 4' },
] as const;

const THICKNESS_OPTIONS = [
  { value: 1, label: 'Thin' },
  { value: 2, label: 'Normal' },
  { value: 3, label: 'Thick' },
  { value: 4, label: 'Extra Thick' },
] as const;

const TEAL = '#0d9488';

/* ─── SVG Line Preview ─── */
function LinePreview({
  dashArray,
  thickness,
}: {
  dashArray: string;
  thickness: number;
}) {
  return (
    <svg
      width="40"
      height="16"
      viewBox="0 0 40 16"
      className="flex-shrink-0"
    >
      <line
        x1="2"
        y1="8"
        x2="38"
        y2="8"
        stroke={TEAL}
        strokeWidth={thickness}
        strokeDasharray={dashArray === 'none' ? undefined : dashArray}
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ─── Edge Type SVG Preview ─── */
function EdgeTypePreview({ type }: { type: string }) {
  const getPath = () => {
    switch (type) {
      case 'smoothstep':
        return 'M 2 8 L 10 8 C 14 8, 14 8, 18 8 L 22 8 C 26 8, 26 8, 30 8 L 38 8';
      case 'bezier':
        return 'M 2 8 C 12 2, 28 14, 38 8';
      case 'straight':
        return 'M 2 8 L 38 8';
      case 'step':
        return 'M 2 8 L 20 8 L 20 8 L 38 8';
      default:
        return 'M 2 8 L 38 8';
    }
  };

  return (
    <svg
      width="40"
      height="16"
      viewBox="0 0 40 16"
      className="flex-shrink-0"
    >
      <path
        d={getPath()}
        stroke={TEAL}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Main Component ─── */
export default function EdgeStylePicker({
  edge,
  currentStyle,
  onStyleChange,
  children,
}: EdgeStylePickerProps) {
  const [style, setStyle] = useState<EdgeStyleData>(currentStyle);
  const [open, setOpen] = useState(false);

  const handleApply = () => {
    onStyleChange(edge.id, style);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-0"
        side="right"
        align="start"
        sideOffset={8}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-700/50">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Edge Style
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Customize the appearance of this edge
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Edge Type */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Edge Type
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {EDGE_TYPES.map((opt) => {
                const Icon = opt.icon;
                const isActive = style.edgeType === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setStyle((s) => ({ ...s, edgeType: opt.value }))
                    }
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 ring-1 ring-teal-200 dark:ring-teal-700/50'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <Icon className="size-3.5 flex-shrink-0" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Animation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {style.animated ? (
                <Zap className="size-3.5 text-teal-600 dark:text-teal-400" />
              ) : (
                <ZapOff className="size-3.5 text-gray-400 dark:text-gray-500" />
              )}
              <div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Animation
                </span>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                  {style.animated ? 'Animated flow effect' : 'Static line'}
                </p>
              </div>
            </div>
            <Switch
              checked={style.animated}
              onCheckedChange={(checked) =>
                setStyle((s) => ({ ...s, animated: checked }))
              }
            />
          </div>

          <Separator />

          {/* Line Style */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Line Style
            </label>
            <div className="space-y-1">
              {LINE_STYLES.map((opt) => {
                const isActive = style.lineStyle === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setStyle((s) => ({ ...s, lineStyle: opt.value }))
                    }
                    className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 ring-1 ring-teal-200 dark:ring-teal-700/50'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <LinePreview
                      dashArray={opt.dashArray}
                      thickness={style.thickness}
                    />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Thickness */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Thickness
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {THICKNESS_OPTIONS.map((opt) => {
                const isActive = style.thickness === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setStyle((s) => ({ ...s, thickness: opt.value }))
                    }
                    className={`flex flex-col items-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 ring-1 ring-teal-200 dark:ring-teal-700/50'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <LinePreview
                      dashArray={
                        style.lineStyle === 'dashed'
                          ? '8 4'
                          : style.lineStyle === 'dotted'
                            ? '2 4'
                            : 'none'
                      }
                      thickness={opt.value}
                    />
                    <span className="text-[10px]">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <Separator />
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Preview
            </label>
            <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-lg p-3 flex items-center justify-center">
              <svg
                width="220"
                height="40"
                viewBox="0 0 220 40"
                className="overflow-visible"
              >
                {/* Source node dot */}
                <circle cx="10" cy="20" r="4" fill={TEAL} />
                {/* Edge path */}
                {(() => {
                  const pathD =
                    style.edgeType === 'bezier'
                      ? 'M 14 20 C 70 5, 160 35, 210 20'
                      : style.edgeType === 'smoothstep'
                        ? 'M 14 20 L 80 20 C 100 20, 120 20, 140 20 L 210 20'
                        : style.edgeType === 'step'
                          ? 'M 14 20 L 112 20 L 112 20 L 210 20'
                          : 'M 14 20 L 210 20';
                  return (
                    <path
                      d={pathD}
                      stroke={TEAL}
                      strokeWidth={style.thickness}
                      fill="none"
                      strokeDasharray={
                        style.lineStyle === 'dashed'
                          ? '8 4'
                          : style.lineStyle === 'dotted'
                            ? '2 4'
                            : undefined
                      }
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })()}
                {/* Animated indicator */}
                {style.animated && (
                  <>
                    <circle r="3" fill={TEAL} opacity="0.6">
                      <animateMotion
                        dur="2s"
                        repeatCount="indefinite"
                        path={
                          style.edgeType === 'bezier'
                            ? 'M 14 20 C 70 5, 160 35, 210 20'
                            : style.edgeType === 'smoothstep'
                              ? 'M 14 20 L 80 20 C 100 20, 120 20, 140 20 L 210 20'
                              : style.edgeType === 'step'
                                ? 'M 14 20 L 112 20 L 112 20 L 210 20'
                                : 'M 14 20 L 210 20'
                        }
                      />
                    </circle>
                  </>
                )}
                {/* Target node dot */}
                <circle cx="210" cy="20" r="4" fill={TEAL} />
              </svg>
            </div>
          </div>
        </div>

        {/* Footer with Apply button */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-neutral-700/50 flex justify-end">
          <button
            onClick={handleApply}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors duration-150 shadow-sm"
          >
            Apply
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
