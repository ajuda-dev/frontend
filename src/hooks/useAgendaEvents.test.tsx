import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventItem } from "../types/api";
import { useAgendaEvents } from "./useAgendaEvents";

vi.mock("../services/event", () => ({
  listEvents: vi.fn(),
}));

import { listEvents } from "../services/event";

const mockedList = vi.mocked(listEvents);

function event(id: string, title: string): EventItem {
  return {
    id,
    title,
    description: "descrição",
    category: "COMMUNITY_EVENT",
    type: "ONLINE",
    start_at: "2026-10-01T18:00:00-03:00",
    duration_min: 60,
  };
}

describe("useAgendaEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedList.mockResolvedValue({ data: [], has_next: false });
  });

  it("busca confirmados e convites com limit 50", async () => {
    const { result } = renderHook(() => useAgendaEvents("u1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedList).toHaveBeenCalledTimes(2);
    expect(mockedList).toHaveBeenCalledWith({
      page: 1,
      limit: 50,
      userId: "u1",
      status: "CONFIRMED",
      signal: expect.any(AbortSignal),
    });
    expect(mockedList).toHaveBeenCalledWith({
      page: 1,
      limit: 50,
      userId: "u1",
      status: "REQUESTED",
      signal: expect.any(AbortSignal),
    });
  });

  it("pagina enquanto has_next e etiqueta o status", async () => {
    mockedList.mockImplementation(async (params) => {
      if (params.status === "CONFIRMED" && params.page === 1) {
        return { data: [event("e1", "Um")], has_next: true };
      }
      if (params.status === "CONFIRMED" && params.page === 2) {
        return { data: [event("e2", "Dois")], has_next: false };
      }
      return { data: [event("e3", "Convite")], has_next: false };
    });

    const { result } = renderHook(() => useAgendaEvents("u1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.events.map((item) => item.id)).toEqual(["e1", "e2", "e3"]);
    expect(result.current.events.find((item) => item.id === "e1")?.participationStatus).toBe("CONFIRMED");
    expect(result.current.events.find((item) => item.id === "e3")?.participationStatus).toBe("REQUESTED");
    expect(mockedList).toHaveBeenCalledWith(expect.objectContaining({ status: "CONFIRMED", page: 2 }));
  });

  it("não chama a API sem userId", async () => {
    const { result } = renderHook(() => useAgendaEvents(""));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedList).not.toHaveBeenCalled();
    expect(result.current.events).toEqual([]);
  });
});
