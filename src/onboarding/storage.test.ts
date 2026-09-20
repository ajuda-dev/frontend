import { afterEach, describe, expect, it } from "vitest";
import { hasSeenOnboarding, markOnboardingSeen, onboardingStorageKey } from "./storage";

describe("onboarding storage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("marca e lê por userId", () => {
    expect(hasSeenOnboarding("u1")).toBe(false);
    markOnboardingSeen("u1");
    expect(hasSeenOnboarding("u1")).toBe(true);
    expect(hasSeenOnboarding("u2")).toBe(false);
    expect(localStorage.getItem(onboardingStorageKey("u1"))).toBe(JSON.stringify({ seen: true }));
  });

  it("JSON inválido conta como não visto", () => {
    localStorage.setItem(onboardingStorageKey("u1"), "{isso não é json");
    expect(hasSeenOnboarding("u1")).toBe(false);
  });

  it("payload sem seen não conta como visto", () => {
    localStorage.setItem(onboardingStorageKey("u1"), JSON.stringify({ other: true }));
    expect(hasSeenOnboarding("u1")).toBe(false);
  });
});
