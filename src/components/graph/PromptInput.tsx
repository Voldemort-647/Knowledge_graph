'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  Send,
  MessageSquare,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { processNLP, type NLPResponse } from '@/services/api';

const MAX_CHARS = 500;

interface PromptInputProps {
  onResult?: (data: NLPResponse) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const EXAMPLE_PROMPTS = [
  'Elon Musk founded Tesla and leads SpaceX',
  'Python is used for AI and web development',
  'Apple created the iPhone, and Steve Jobs co-founded Apple',
];

/* ─── Typing indicator dots animation ─── */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1">
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-teal-500"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.4, repeat: Infinity, ease: 'easeInOut', delay: 0 }}
      />
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-teal-500"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.4, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
      />
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-teal-500"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.4, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      />
    </div>
  );
}

export default function PromptInput({
  onResult,
  isExpanded,
  onToggleExpand,
}: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastMessage, setLastMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when expanded
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [isExpanded]);

  const handleSubmit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isProcessing) return;

    setIsProcessing(true);
    setLastMessage('');

    try {
      const data = await processNLP(trimmed);
      setLastMessage(data.message || `Generated ${data.nodes.length} nodes and ${data.edges.length} edges`);
      toast.success(data.message || 'Graph generated successfully!');
      setPrompt('');
      onResult?.(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process prompt';
      setLastMessage(`Error: ${message}`);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
    textareaRef.current?.focus();
  };

  const charCount = prompt.length;
  const isNearLimit = charCount > MAX_CHARS * 0.8;

  return (
    <div className="border-b border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm">
      {/* Toggle Button */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50/80 dark:hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 shadow-sm">
            <Sparkles className="size-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">AI Graph Generator</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Describe relationships in natural language
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <TypingIndicator />
          ) : lastMessage ? (
            <MessageSquare className="size-4 text-teal-500" />
          ) : null}
          {isExpanded ? (
            <ChevronUp className="size-4 text-gray-400 dark:text-gray-500" />
          ) : (
            <ChevronDown className="size-4 text-gray-400 dark:text-gray-500" />
          )}
        </div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Input area */}
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_CHARS) {
                      setPrompt(e.target.value);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., Elon Musk founded Tesla and leads SpaceX"
                  className="resize-none min-h-[80px] pr-12 border-gray-200 dark:border-neutral-700 focus:border-teal-400 dark:focus:border-teal-600 focus:ring-teal-400/20 dark:focus:ring-teal-600/20 text-sm bg-gray-50/50 dark:bg-neutral-800/50"
                  disabled={isProcessing}
                />
                <Button
                  size="icon"
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || isProcessing}
                  className="absolute right-2 bottom-2 size-8 rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm disabled:opacity-40"
                >
                  {isProcessing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>

              {/* Character count */}
              <div className="flex justify-end">
                <span className={`text-[11px] transition-colors ${isNearLimit ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'}`}>
                  {charCount}/{MAX_CHARS}
                </span>
              </div>

              {/* Example prompts */}
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => handleExampleClick(example)}
                    className="text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-neutral-700 text-gray-500 dark:text-gray-400 hover:text-teal-700 dark:hover:text-teal-400 hover:border-teal-200 dark:hover:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>

              {/* Result message */}
              <AnimatePresence>
                {lastMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-start gap-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/40 px-3 py-2"
                  >
                    <MessageSquare className="size-4 text-teal-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-teal-800 dark:text-teal-300">{lastMessage}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
