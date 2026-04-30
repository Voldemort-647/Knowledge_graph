'use client';

import { Keyboard, Delete, FilePlus, GitBranch, X, HelpCircle, Undo2, Redo2, LayoutGrid, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useOnboardingStore } from '@/store/onboarding-store';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  keys: string[];
  label: string;
  icon: React.ReactNode;
}

const SHORTCUTS: ShortcutItem[] = [
  {
    keys: ['Delete', '/ Backspace'],
    label: 'Delete selected node or edge',
    icon: <Delete className="size-4 text-rose-500" />,
  },
  {
    keys: ['Ctrl', 'N'],
    label: 'Create a new node',
    icon: <FilePlus className="size-4 text-teal-500" />,
  },
  {
    keys: ['Ctrl', 'E'],
    label: 'Create a new edge',
    icon: <GitBranch className="size-4 text-emerald-500" />,
  },
  {
    keys: ['L'],
    label: 'Apply auto-layout to graph',
    icon: <LayoutGrid className="size-4 text-amber-500" />,
  },
  {
    keys: ['Ctrl', 'Z'],
    label: 'Undo last action',
    icon: <Undo2 className="size-4 text-violet-500" />,
  },
  {
    keys: ['Ctrl', 'Shift', 'Z'],
    label: 'Redo last action',
    icon: <Redo2 className="size-4 text-violet-400" />,
  },
  {
    keys: ['?'],
    label: 'Show this shortcuts dialog',
    icon: <HelpCircle className="size-4 text-violet-500" />,
  },
  {
    keys: ['Escape'],
    label: 'Deselect all items',
    icon: <X className="size-4 text-gray-500" />,
  },
];

export default function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500">
              <Keyboard className="size-3.5 text-white" />
            </div>
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick actions to navigate and manage your graph.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {SHORTCUTS.map((shortcut, index) => (
            <div key={shortcut.label}>
              <div className="flex items-center gap-3 py-2.5 px-1 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                <div className="flex-shrink-0">{shortcut.icon}</div>
                <p className="text-sm text-gray-700 dark:text-gray-200 flex-1">{shortcut.label}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {shortcut.keys.map((key, ki) => (
                    <span key={key} className="flex items-center gap-1">
                      <kbd className="inline-flex items-center justify-center h-6 px-2 text-[11px] font-mono font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-md shadow-sm">
                        {key}
                      </kbd>
                      {ki < shortcut.keys.length - 1 && (
                        <span className="text-gray-300 dark:text-neutral-600 text-xs">+</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
              {index < SHORTCUTS.length - 1 && <Separator />}
            </div>
          ))}
        </div>

        {/* Restart Tutorial */}
        <Separator />
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 hover:border-teal-300 dark:hover:border-teal-700"
            onClick={() => {
              useOnboardingStore.getState().resetForRestart();
              onOpenChange(false);
            }}
          >
            <RotateCcw className="size-4" />
            Restart Tutorial
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
