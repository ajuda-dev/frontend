import { afterEach, describe, expect, it, vi } from "vitest";
import {
  notificationStreamUrl,
  parseNotificationStreamData,
} from "./notificationStream";

describe("parseNotificationStreamData", () => {
  it("aceita envelope válido com id numérico", () => {
    expect(
      parseNotificationStreamData(
        JSON.stringify({
          id: 42,
          type: "COMMUNITY_EVENT_PENDING_APPROVAL",
          payload: { event_id: "e1", title: "Meetup" },
        }),
      ),
    ).toEqual({
      id: 42,
      type: "COMMUNITY_EVENT_PENDING_APPROVAL",
      payload: { event_id: "e1", title: "Meetup" },
    });
  });

  it("usa lastEventId quando o data não traz id", () => {
    expect(
      parseNotificationStreamData(
        JSON.stringify({ type: "MENTORING_INVITE_PENDING", payload: { event_id: "e2" } }),
        "42",
      ),
    ).toEqual({
      id: 42,
      type: "MENTORING_INVITE_PENDING",
      payload: { event_id: "e2" },
    });
  });

  it("normaliza payload ausente para objeto vazio", () => {
    expect(parseNotificationStreamData(JSON.stringify({ id: 1, type: "MENTORING_INVITE_PENDING" }))).toEqual({
      id: 1,
      type: "MENTORING_INVITE_PENDING",
      payload: {},
    });
  });

  it("JSON inválido devolve null e avisa uma vez", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(parseNotificationStreamData("não-é-json")).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("rejeita type ausente ou id não numérico", () => {
    expect(parseNotificationStreamData(JSON.stringify({ id: 1 }))).toBeNull();
    expect(parseNotificationStreamData(JSON.stringify({ type: "X" }), "abc")).toBeNull();
  });
});

describe("notificationStreamUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("usa /v1/notifications/stream no default", () => {
    expect(notificationStreamUrl()).toBe("/v1/notifications/stream");
  });

  it("concatena path quando a base é absoluta", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.ajudadev.dev/v1/");
    expect(notificationStreamUrl()).toBe("https://api.ajudadev.dev/v1/notifications/stream");
  });
});
