import { describe, expect, it } from "vitest";
import type { EventItem } from "../types/api";
import { canManageEvent, complementaryRole, isEventApproved } from "./events";

describe("isEventApproved", () => {
  it("trata status ausente como aprovado", () => {
    expect(isEventApproved({})).toBe(true);
  });

  it("trata status vazio como aprovado (linha anterior ao plano 27 do backend)", () => {
    expect(isEventApproved({ status: "" as never })).toBe(true);
  });

  it("trata APPROVED como aprovado", () => {
    expect(isEventApproved({ status: "APPROVED" })).toBe(true);
  });

  it("bloqueia PENDING e REJECTED", () => {
    expect(isEventApproved({ status: "PENDING" })).toBe(false);
    expect(isEventApproved({ status: "REJECTED" })).toBe(false);
  });
});

describe("complementaryRole", () => {
  it("devolve o papel oposto ao de quem criou", () => {
    expect(complementaryRole("MENTOR")).toBe("MENTEE");
    expect(complementaryRole("MENTEE")).toBe("MENTOR");
  });
});

function event(overrides: Partial<EventItem> = {}): Pick<EventItem, "owner" | "community"> {
  return {
    owner: { id: "owner-1", name: "Ana", email: "ana@ajudadev.dev", role: "USER" },
    community: null,
    ...overrides,
  };
}

describe("canManageEvent", () => {
  it("libera para quem criou o evento", () => {
    expect(canManageEvent(event(), { id: "owner-1", role: "USER" })).toBe(true);
  });

  it("libera para o dono da comunidade do evento", () => {
    const withCommunity = event({
      community: {
        id: "c1",
        name: "Dev SP",
        description: "Comunidade de São Paulo",
        owner: { id: "dono-c1", name: "Bea", email: "bea@ajudadev.dev", role: "USER" },
      },
    });

    expect(canManageEvent(withCommunity, { id: "dono-c1", role: "USER" })).toBe(true);
  });

  it("libera para MODERATOR e ADMIN", () => {
    expect(canManageEvent(event(), { id: "u9", role: "MODERATOR" })).toBe(true);
    expect(canManageEvent(event(), { id: "u9", role: "ADMIN" })).toBe(true);
  });

  it("nega para usuário comum de outra comunidade", () => {
    const withCommunity = event({
      community: {
        id: "c1",
        name: "Dev SP",
        description: "Comunidade de São Paulo",
        owner: { id: "dono-c1", name: "Bea", email: "bea@ajudadev.dev", role: "USER" },
      },
    });

    expect(canManageEvent(withCommunity, { id: "u1", role: "USER" })).toBe(false);
  });

  it("nega sem sessão", () => {
    expect(canManageEvent(event(), null)).toBe(false);
    expect(canManageEvent(event(), undefined)).toBe(false);
  });

  it("nega quando o evento não traz owner nem comunidade", () => {
    expect(canManageEvent({ owner: null, community: null }, { id: "u1", role: "USER" })).toBe(
      false,
    );
  });
});
