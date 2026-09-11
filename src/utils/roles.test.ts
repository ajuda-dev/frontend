import { describe, expect, it } from "vitest";
import { canAtLeast, roleRank } from "./roles";

describe("roleRank", () => {
  it("ordena USER < MODERATOR < ADMIN", () => {
    expect(roleRank("USER")).toBe(1);
    expect(roleRank("MODERATOR")).toBe(2);
    expect(roleRank("ADMIN")).toBe(3);
    expect(roleRank("USER")).toBeLessThan(roleRank("MODERATOR"));
    expect(roleRank("MODERATOR")).toBeLessThan(roleRank("ADMIN"));
  });

  it("sem papel (sessão ausente) vale 0", () => {
    expect(roleRank(null)).toBe(0);
    expect(roleRank(undefined)).toBe(0);
  });
});

describe("canAtLeast", () => {
  it("USER só atende o mínimo USER", () => {
    expect(canAtLeast("USER", "USER")).toBe(true);
    expect(canAtLeast("USER", "MODERATOR")).toBe(false);
    expect(canAtLeast("USER", "ADMIN")).toBe(false);
  });

  it("MODERATOR atende MODERATOR e abaixo", () => {
    expect(canAtLeast("MODERATOR", "USER")).toBe(true);
    expect(canAtLeast("MODERATOR", "MODERATOR")).toBe(true);
    expect(canAtLeast("MODERATOR", "ADMIN")).toBe(false);
  });

  it("ADMIN atende qualquer mínimo", () => {
    expect(canAtLeast("ADMIN", "USER")).toBe(true);
    expect(canAtLeast("ADMIN", "MODERATOR")).toBe(true);
    expect(canAtLeast("ADMIN", "ADMIN")).toBe(true);
  });

  it("sem papel nunca atende", () => {
    expect(canAtLeast(null, "USER")).toBe(false);
    expect(canAtLeast(undefined, "USER")).toBe(false);
  });
});
