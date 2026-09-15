import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Notification, Pageable } from "../types/api";
import { api } from "./api";
import { listNotifications, markNotificationRead } from "./notification";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

const mockedGet = vi.mocked(api.get);
const mockedPut = vi.mocked(api.put);

function notification(id: number, overrides: Partial<Notification> = {}): Notification {
  return {
    id,
    type: "COMMUNITY_EVENT_PENDING_APPROVAL",
    payload: { event_id: "e1", title: "Meetup", community_id: "c1" },
    created_at: "2026-09-14T12:00:00Z",
    read_at: null,
    ...overrides,
  };
}

function page(data: Notification[], hasNext: boolean): Pageable<Notification> {
  return { data, has_next: hasNext };
}

describe("listNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("envia page, limit 10 e status unread por padrão", async () => {
    const listed = notification(1);
    mockedGet.mockResolvedValue({ data: page([listed], false) });

    const result = await listNotifications({ page: 1 });

    expect(mockedGet).toHaveBeenCalledWith("/notifications", {
      params: { page: 1, limit: 10, status: "unread" },
      signal: undefined,
    });
    expect(result).toEqual(page([listed], false));
  });

  it("envia status read na query", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });

    await listNotifications({ page: 2, status: "read" });

    expect(mockedGet).toHaveBeenCalledWith("/notifications", {
      params: { page: 2, limit: 10, status: "read" },
      signal: undefined,
    });
  });

  it("propaga o AbortSignal", async () => {
    mockedGet.mockResolvedValue({ data: page([], true) });
    const signal = new AbortController().signal;

    const result = await listNotifications({ page: 1, limit: 20, status: "all", signal });

    expect(mockedGet).toHaveBeenCalledWith("/notifications", {
      params: { page: 1, limit: 20, status: "all" },
      signal,
    });
    expect(result.has_next).toBe(true);
  });

  it("normaliza read_at omitido para null", async () => {
    mockedGet.mockResolvedValue({
      data: {
        data: [
          {
            id: 7,
            type: "MENTORING_INVITE_PENDING",
            payload: { event_id: "e2", category: "MENTORING" },
            created_at: "2026-09-14T12:00:00Z",
          },
        ],
        has_next: false,
      },
    });

    const result = await listNotifications({ page: 1 });

    expect(result.data[0]?.read_at).toBeNull();
    expect(result.data[0]?.payload).toEqual({ event_id: "e2", category: "MENTORING" });
  });
});

describe("markNotificationRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("chama PUT no id numérico e devolve o item", async () => {
    const read = notification(42, { read_at: "2026-09-14T13:00:00Z" });
    mockedPut.mockResolvedValue({ data: read });

    const result = await markNotificationRead(42);

    expect(mockedPut).toHaveBeenCalledWith("/notifications/42/read");
    expect(result).toEqual(read);
  });

  it("normaliza read_at omitido para null", async () => {
    mockedPut.mockResolvedValue({
      data: {
        id: 3,
        type: "COMMUNITY_EVENT_PENDING_APPROVAL",
        payload: { event_id: "e1" },
        created_at: "2026-09-14T12:00:00Z",
      },
    });

    const result = await markNotificationRead(3);

    expect(result.read_at).toBeNull();
  });
});
