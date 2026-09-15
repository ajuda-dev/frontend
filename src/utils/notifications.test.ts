import { describe, expect, it } from "vitest";
import type { Notification } from "../types/api";
import {
  mergeNotifications,
  notificationHref,
  notificationTitle,
  unreadBadgeLabel,
} from "./notifications";

function item(id: number, overrides: Partial<Notification> = {}): Notification {
  return {
    id,
    type: "COMMUNITY_EVENT_PENDING_APPROVAL",
    payload: { event_id: `e${id}`, title: `Evento ${id}` },
    created_at: "2026-09-14T12:00:00.000Z",
    read_at: null,
    ...overrides,
  };
}

describe("notificationTitle", () => {
  it("usa o título do evento quando existe", () => {
    expect(notificationTitle(item(1, { payload: { title: "Meetup Dev" } }))).toBe(
      "Meetup Dev aguarda a sua aprovação",
    );
  });

  it("tem fallback quando o evento não traz título", () => {
    expect(notificationTitle(item(1, { payload: {} }))).toBe(
      "Um evento da comunidade aguarda a sua aprovação",
    );
  });

  it("usa copy fixa no convite de mentoria", () => {
    expect(
      notificationTitle(
        item(2, { type: "MENTORING_INVITE_PENDING", payload: { event_id: "e2", category: "MENTORING" } }),
      ),
    ).toBe("Você recebeu um convite de mentoria 1:1");
  });
});

describe("notificationHref", () => {
  it("aponta para o detalhe do evento", () => {
    expect(notificationHref(item(1, { payload: { event_id: "evt-1" } }))).toBe("/eventos/evt-1");
  });

  it("devolve null sem event_id", () => {
    expect(notificationHref(item(1, { payload: {} }))).toBeNull();
  });
});

describe("mergeNotifications", () => {
  it("primary ganha no mesmo id e ordena por created_at e id desc", () => {
    const api = item(2, { created_at: "2026-09-14T13:00:00.000Z", payload: { event_id: "from-api" } });
    const local = item(2, { created_at: "2026-09-14T20:00:00.000Z", payload: { event_id: "from-sse" } });
    const older = item(1, { created_at: "2026-09-14T12:00:00.000Z" });

    const merged = mergeNotifications([api], [local, older]);

    expect(merged.map((n) => n.id)).toEqual([2, 1]);
    expect(merged[0]?.payload.event_id).toBe("from-api");
  });

  it("ignora tipo desconhecido e itens já lidos", () => {
    const unread = item(1);
    const unknown = item(2, { type: "PASSWORD_RESET" });
    const read = item(3, { read_at: "2026-09-14T13:00:00.000Z" });

    expect(mergeNotifications([unread, unknown, read], [])).toEqual([unread]);
  });
});

describe("unreadBadgeLabel", () => {
  it("vazio, número e sufixo +", () => {
    expect(unreadBadgeLabel(0, false)).toBe("");
    expect(unreadBadgeLabel(1, false)).toBe("1");
    expect(unreadBadgeLabel(10, true)).toBe("10+");
    expect(unreadBadgeLabel(100, false)).toBe("99+");
  });
});
