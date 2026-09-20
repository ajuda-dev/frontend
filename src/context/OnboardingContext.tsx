import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { OnboardingContext } from "../hooks/useOnboarding";
import { ONBOARDING_STEPS } from "../onboarding/steps";
import { hasSeenOnboarding, markOnboardingSeen } from "../onboarding/storage";
import { useAuth } from "./useAuth";

const LAST_STEP = ONBOARDING_STEPS.length - 1;

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [open, setOpen] = useState(() => Boolean(userId && !hasSeenOnboarding(userId)));
  const [stepIndex, setStepIndex] = useState(0);

  const start = useCallback(() => {
    setStepIndex(0);
    setOpen(true);
  }, []);

  const dismiss = useCallback(() => {
    if (userId) markOnboardingSeen(userId);
    setOpen(false);
    setStepIndex(0);
  }, [userId]);

  const next = useCallback(() => {
    setStepIndex((current) => Math.min(current + 1, LAST_STEP));
  }, []);

  const back = useCallback(() => {
    setStepIndex((current) => Math.max(current - 1, 0));
  }, []);

  const value = useMemo(
    () => ({
      open,
      stepIndex,
      steps: ONBOARDING_STEPS,
      start,
      dismiss,
      next,
      back,
    }),
    [open, stepIndex, start, dismiss, next, back],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}
