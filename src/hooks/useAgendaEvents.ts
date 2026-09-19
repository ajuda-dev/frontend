import { useCallback, useEffect, useRef, useState } from "react";
import { listEvents } from "../services/event";
import type { EventItem, ParticipationStatus } from "../types/api";

export type AgendaParticipationStatus = Extract<ParticipationStatus, "CONFIRMED" | "REQUESTED">;

export interface AgendaEvent extends EventItem {
  participationStatus: AgendaParticipationStatus;
}

const PAGE_LIMIT = 50;
const MAX_PAGES = 20;
const STATUSES: AgendaParticipationStatus[] = ["CONFIRMED", "REQUESTED"];

async function fetchStatus(
  userId: string,
  status: AgendaParticipationStatus,
  signal: AbortSignal,
): Promise<AgendaEvent[]> {
  const collected: AgendaEvent[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await listEvents({ page, limit: PAGE_LIMIT, userId, status, signal });
    for (const item of result.data) {
      collected.push({ ...item, participationStatus: status });
    }
    if (!result.has_next) break;
  }
  return collected;
}

export interface UseAgendaEventsResult {
  events: AgendaEvent[];
  loading: boolean;
  error: unknown;
  reload: () => void;
}

export function useAgendaEvents(userId: string): UseAgendaEventsResult {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<unknown>(null);
  const requestIdRef = useRef(0);

  const run = useCallback(async (signal: AbortSignal) => {
    if (!userId) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const pages = await Promise.all(STATUSES.map((status) => fetchStatus(userId, status, signal)));
      if (requestId !== requestIdRef.current || signal.aborted) return;
      const seen = new Set<string>();
      const merged: AgendaEvent[] = [];
      for (const item of pages.flat()) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        merged.push(item);
      }
      setEvents(merged);
    } catch (caught) {
      if (requestId !== requestIdRef.current || signal.aborted) return;
      setError(caught);
      setEvents([]);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void run(controller.signal);
    }, 0);
    return () => {
      requestIdRef.current += 1;
      controller.abort();
      clearTimeout(timer);
    };
  }, [run]);

  const reload = useCallback(() => {
    const controller = new AbortController();
    void run(controller.signal);
  }, [run]);

  return { events, loading, error, reload };
}
