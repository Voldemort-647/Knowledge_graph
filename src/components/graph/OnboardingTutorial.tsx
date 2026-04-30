'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network,
  Plus,
  GitBranch,
  Sparkles,
  LayoutGrid,
  Rocket,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useOnboardingStore,
  TOTAL_STEPS,
} from '@/store/onboarding-store';

/* ─── Step Data ─── */
interface StepData {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
}

const STEPS: StepData[] = [
  {
    title: 'Welcome to Knowledge Graph Builder',
    description:
      'Create beautiful, interactive knowledge graphs to visualize entities and their relationships. Let us walk you through the key features.',
    icon: <Network className="size-7 text-white" />,
    iconBg: 'bg-gradient-to-br from-teal-500 to-teal-600',
  },
  {
    title: 'Create Your First Node',
    description:
      'Click the "Add Node" button in the header to create entities. Nodes represent people, concepts, places, or anything you want to connect. Each node can have a custom label, color, and image.',
    icon: <Plus className="size-7 text-white" />,
    iconBg: 'bg-gradient-to-br from-teal-500 to-emerald-500',
  },
  {
    title: 'Connect Nodes',
    description:
      'Click the "Add Edge" button to create relationships between nodes. Drag from a node\'s handle to another node to visually connect them. Edges can have custom labels like "leads", "related to", or "depends on".',
    icon: <GitBranch className="size-7 text-white" />,
    iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
  },
  {
    title: 'Try AI Generation',
    description:
      'Use the "AI Graph Generator" to automatically create a graph from natural language. Just describe what you want — for example, "Elon Musk founded SpaceX and Tesla" — and watch your graph appear.',
    icon: <Sparkles className="size-7 text-white" />,
    iconBg: 'bg-gradient-to-br from-amber-400 to-amber-500',
  },
  {
    title: 'Explore the Toolbar',
    description:
      'The floating toolbar on the right gives you quick access to powerful features: auto-layout, search, statistics, undo/redo, node palette, templates, and more. Press "?" anytime to see all keyboard shortcuts.',
    icon: <LayoutGrid className="size-7 text-white" />,
    iconBg: 'bg-gradient-to-br from-teal-400 to-teal-600',
  },
  {
    title: "You're All Set!",
    description:
      'You now know the basics. Start building your knowledge graph by adding nodes, connecting them with edges, or letting AI generate one for you. Happy graphing!',
    icon: <Rocket className="size-7 text-white" />,
    iconBg: 'bg-gradient-to-br from-teal-500 to-emerald-500',
  },
];

/* ─── Animation Variants ─── */
const cardVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
    scale: 0.95,
  }),
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

/* ─── Component ─── */
export default function OnboardingTutorial() {
  const {
    currentStep,
    isOnboardingActive,
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,
  } = useOnboardingStore();

  const [direction, setDirection] = useState(1);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  const isLastStep = currentStep === TOTAL_STEPS - 1;
  const isFirstStep = currentStep === 0;
  const step = STEPS[currentStep];

  // Auto-dismiss on Escape key
  useEffect(() => {
    if (!isOnboardingActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skipOnboarding();
      }
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (isLastStep) {
          completeOnboarding();
        } else {
          setDirection(1);
          nextStep();
        }
      }
      if (e.key === 'ArrowLeft') {
        setDirection(-1);
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOnboardingActive, isLastStep, nextStep, prevStep, skipOnboarding, completeOnboarding]);

  const handleNext = () => {
    if (isLastStep) {
      completeOnboarding();
    } else {
      setDirection(1);
      nextStep();
    }
  };

  const handlePrev = () => {
    setDirection(-1);
    prevStep();
  };

  const handleSkip = () => {
    skipOnboarding();
  };

  const handleFinish = () => {
    completeOnboarding();
  };

  return (
    <AnimatePresence>
      {isOnboardingActive && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm pointer-events-none"
          />

          {/* Tutorial Card */}
          <div className="relative z-10 pointer-events-auto">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={cardVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-gray-200/60 dark:border-neutral-700/60 overflow-hidden"
              >
                {/* Gradient header strip */}
                <div className="h-1.5 bg-gradient-to-r from-teal-500 to-emerald-500" />

                {/* Close button */}
                <div className="absolute top-5 right-4">
                  <button
                    onClick={handleSkip}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                    aria-label="Skip tutorial"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="p-6 pt-5">
                  {/* Icon */}
                  <div className="flex items-center justify-center mb-5">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 20,
                        delay: 0.05,
                      }}
                      className={`w-16 h-16 rounded-2xl ${step.iconBg} flex items-center justify-center shadow-lg`}
                    >
                      {step.icon}
                    </motion.div>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 text-center mb-3">
                    {step.title}
                  </h2>

                  {/* Description */}
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed mb-6">
                    {step.description}
                  </p>

                  {/* Step indicator dots */}
                  <div className="flex items-center justify-center gap-2 mb-6">
                    {STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                          i === currentStep
                            ? 'bg-teal-500'
                            : 'bg-gray-200 dark:bg-neutral-600'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    {/* Back / Skip */}
                    <div>
                      {isFirstStep ? (
                        <button
                          onClick={handleSkip}
                          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          Skip
                        </button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handlePrev}
                          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 gap-1"
                        >
                          <ChevronLeft className="size-4" />
                          Back
                        </Button>
                      )}
                    </div>

                    {/* Next / Start Building */}
                    {isLastStep ? (
                      <div className="flex flex-col items-end gap-2">
                        <label className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-gray-300 dark:border-neutral-600 text-teal-500 focus:ring-teal-500"
                          />
                          Don&apos;t show again
                        </label>
                        <Button
                          size="sm"
                          onClick={handleFinish}
                          className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white gap-2 shadow-md shadow-teal-500/20"
                        >
                          <Rocket className="size-4" />
                          Start Building
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleNext}
                        className="bg-teal-600 hover:bg-teal-700 text-white gap-1"
                      >
                        Next
                        <ChevronRight className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
