import { describe, expect, it } from "vitest";
import type { EventItem } from "../types/api";
import { canManageEvent, canRescheduleEvent, complementaryRole, isEventApproved } from "./events";

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

function eventForReschedule(
  overrides: Partial<EventItem> = {},
): Pick<EventItem, "owner" | "community" | "category"> {
  return {
    owner: { id: "owner-1", name: "Ana", email: "ana@ajudadev.dev", role: "USER" },
    community: null,
    category: "MENTORING",
    ...overrides,
  };
}

describe("canRescheduleEvent", () => {
  const guest = { id: "u2", role: "USER" as const };

  it("libera para quem gerencia o evento", () => {
    expect(canRescheduleEvent(eventForReschedule(), { id: "owner-1", role: "USER" }, null)).toBe(
      true,
    );
    expect(canRescheduleEvent(eventForReschedule(), { id: "u9", role: "MODERATOR" }, null)).toBe(
      true,
    );
  });

  it("libera o convidado da mentoria em REQUESTED, CONFIRMED e REJECTED", () => {
    const mentoring = eventForReschedule();
    expect(canRescheduleEvent(mentoring, guest, { status: "REQUESTED" })).toBe(true);
    expect(canRescheduleEvent(mentoring, guest, { status: "CONFIRMED" })).toBe(true);
    expect(canRescheduleEvent(mentoring, guest, { status: "REJECTED" })).toBe(true);
  });

  it("nega o convidado CANCELLED", () => {
    expect(canRescheduleEvent(eventForReschedule(), guest, { status: "CANCELLED" })).toBe(false);
  });

  it("nega attendee de evento de comunidade", () => {
    expect(
      canRescheduleEvent(
        eventForReschedule({ category: "COMMUNITY_EVENT" }),
        guest,
        { status: "CONFIRMED", role: "ATTENDEE" },
      ),
    ).toBe(false);
  });

  it("libera o palestrante convidado em REQUESTED, CONFIRMED e REJECTED", () => {
    const communityEvent = eventForReschedule({ category: "COMMUNITY_EVENT" });
    expect(canRescheduleEvent(communityEvent, guest, { status: "REQUESTED", role: "SPEAKER" })).toBe(
      true,
    );
    expect(canRescheduleEvent(communityEvent, guest, { status: "CONFIRMED", role: "SPEAKER" })).toBe(
      true,
    );
    expect(canRescheduleEvent(communityEvent, guest, { status: "REJECTED", role: "SPEAKER" })).toBe(
      true,
    );
    expect(canRescheduleEvent(communityEvent, guest, { status: "CANCELLED", role: "SPEAKER" })).toBe(
      false,
    );
  });
});
