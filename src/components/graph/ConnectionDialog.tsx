'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const RELATIONSHIP_SUGGESTIONS = [
  'founded',
  'leads',
  'created',
  'related_to',
  'part_of',
  'works_at',
  'uses',
  'located_in',
  'produced',
  'owns',
  'collaborates_with',
  'influenced',
];

interface ConnectionDialogProps {
  connection: { source: string; target: string; sourceLabel: string; targetLabel: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (relationship: string) => void;
}

export default function ConnectionDialog({
  connection,
  open,
  onOpenChange,
  onConfirm,
}: ConnectionDialogProps) {
  const [relationship, setRelationship] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = () => {
    if (!relationship.trim()) return;
    setIsSubmitting(true);
    onConfirm(relationship.trim());
    setRelationship('');
    setTimeout(() => {
      setIsSubmitting(false);
    }, 300);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setRelationship('');
      setIsSubmitting(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500">
              <Sparkles className="size-3.5 text-white" />
            </div>
            Create Connection
          </DialogTitle>
          <DialogDescription>
            Define the relationship between two nodes.
          </DialogDescription>
        </DialogHeader>

        {connection && (
          <div className="space-y-4">
            {/* Visual direction indicator */}
            <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-gray-50 to-white border p-4">
              <div className="flex-1 text-center">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center mx-auto mb-1.5">
                  <span className="text-sm font-bold text-teal-700">
                    {connection.sourceLabel.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {connection.sourceLabel}
                </p>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <ArrowRight className="size-4 text-gray-500" />
                </div>
              </div>

              <div className="flex-1 text-center">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-1.5">
                  <span className="text-sm font-bold text-emerald-700">
                    {connection.targetLabel.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {connection.targetLabel}
                </p>
              </div>
            </div>

            {/* Relationship suggestions */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Relationship Type
              </p>
              <div className="flex flex-wrap gap-1.5">
                {RELATIONSHIP_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setRelationship(suggestion)}
                    className={`
                      px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150
                      ${
                        relationship === suggestion
                          ? 'bg-teal-600 text-white shadow-sm scale-105'
                          : 'bg-gray-100 text-gray-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 border border-gray-200'
                      }
                    `}
                  >
                    {suggestion.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom input */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Or type a custom relationship
              </p>
              <Input
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g., founded, works_at, related_to"
                className="h-9"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && relationship.trim()) {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
              />
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!relationship.trim() || isSubmitting}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
            onClick={handleConfirm}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ArrowRight className="size-4" />
                Create Connection
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
