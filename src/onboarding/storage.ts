const STORAGE_PREFIX = "ajudadev.onboarding.";

export function onboardingStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function hasSeenOnboarding(userId: string): boolean {
  try {
    const raw = localStorage.getItem(onboardingStorageKey(userId));
    if (!raw) return false;
    const parsed: unknown = JSON.parse(raw);
    if (parsed === true) return true;
    if (typeof parsed !== "object" || parsed === null) return false;
    return (parsed as { seen?: unknown }).seen === true;
  } catch {
    return false;
  }
}

export function markOnboardingSeen(userId: string): void {
  try {
    localStorage.setItem(onboardingStorageKey(userId), JSON.stringify({ seen: true }));
  } catch {
    // Sem localStorage o guia some só nesta sessão (estado do provider).
  }
}
