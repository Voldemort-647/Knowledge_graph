'use client';

import { Keyboard, Delete, FilePlus, GitBranch, X, HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

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

        <div className="space-y-1">
          {SHORTCUTS.map((shortcut, index) => (
            <div key={shortcut.label}>
              <div className="flex items-center gap-3 py-2.5 px-1 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0">{shortcut.icon}</div>
                <p className="text-sm text-gray-700 flex-1">{shortcut.label}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {shortcut.keys.map((key, ki) => (
                    <span key={key} className="flex items-center gap-1">
                      <kbd className="inline-flex items-center justify-center h-6 px-2 text-[11px] font-mono font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-md shadow-sm">
                        {key}
                      </kbd>
                      {ki < shortcut.keys.length - 1 && (
                        <span className="text-gray-300 text-xs">+</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
              {index < SHORTCUTS.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
