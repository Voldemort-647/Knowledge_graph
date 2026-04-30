import { create } from 'zustand';

const STORAGE_KEY = 'kg-onboarding-completed';
const TOTAL_STEPS = 6;

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  currentStep: number;
  isOnboardingActive: boolean;

  completeOnboarding: () => void;
  startOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => void;
  goToStep: (step: number) => void;
  resetForRestart: () => void;
}

export { TOTAL_STEPS };

function readFromStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeToStorage(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  hasCompletedOnboarding: readFromStorage(),
  currentStep: 0,
  isOnboardingActive: false,

  completeOnboarding: () => {
    set({ isOnboardingActive: false, currentStep: TOTAL_STEPS - 1 });
    writeToStorage(true);
  },

  startOnboarding: () => {
    set({ isOnboardingActive: true, currentStep: 0 });
  },

  nextStep: () => {
    const { currentStep } = get();
    if (currentStep < TOTAL_STEPS - 1) {
      set({ currentStep: currentStep + 1 });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  skipOnboarding: () => {
    set({ isOnboardingActive: false, currentStep: 0 });
    writeToStorage(true);
  },

  goToStep: (step: number) => {
    if (step >= 0 && step < TOTAL_STEPS) {
      set({ currentStep: step });
    }
  },

  resetForRestart: () => {
    writeToStorage(false);
    set({ hasCompletedOnboarding: false, isOnboardingActive: true, currentStep: 0 });
  },
}));
