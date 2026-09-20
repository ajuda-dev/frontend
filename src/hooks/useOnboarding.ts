import { createContext, useContext } from "react";
import type { OnboardingStep } from "../onboarding/steps";

export interface OnboardingContextValue {
  open: boolean;
  stepIndex: number;
  steps: OnboardingStep[];
  start: () => void;
  dismiss: () => void;
  next: () => void;
  back: () => void;
}

export const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding deve ser usado dentro de OnboardingProvider");
  }
  return context;
}
