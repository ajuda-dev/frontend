import { describe, expect, it } from "vitest";
import type { AuthUser } from "../types/api";
import { isEmailVerified } from "./emailVerification";

const user = (emailVerified: boolean): AuthUser => ({
  id: "u1",
  name: "Lucas",
  email: "lucas@ajudadev.dev",
  role: "USER",
  emailVerified,
});

describe("isEmailVerified", () => {
  it("só libera quando a flag é true", () => {
    expect(isEmailVerified(user(true))).toBe(true);
    expect(isEmailVerified(user(false))).toBe(false);
  });

  it("ausência de usuário ou da flag conta como não verificado", () => {
    expect(isEmailVerified(null)).toBe(false);
    expect(isEmailVerified(undefined)).toBe(false);
    expect(isEmailVerified({ emailVerified: undefined as unknown as boolean })).toBe(false);
  });
});
