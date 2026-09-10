import { useCallback, useEffect, useRef, useState } from "react";
import type { Pageable } from "../types/api";

interface Identifiable {
  id: string;
}

export interface UsePageableResult<T> {
  items: T[];
  page: number;
  hasNext: boolean;
  loading: boolean;
  error: unknown;
  loadMore: () => void;
  reset: () => void;
}

export function usePageable<T extends Identifiable>(
  fetcher: (page: number) => Promise<Pageable<T>>,
): UsePageableResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const fetcherRef = useRef(fetcher);

  const requestIdRef = useRef(0);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const run = useCallback(async (targetPage: number, append: boolean) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current(targetPage);
      if (requestId !== requestIdRef.current) return;
      setItems((previous) => {
        if (!append) return result.data;
        const seen = new Set(previous.map((item) => item.id));
        return [...previous, ...result.data.filter((item) => !seen.has(item.id))];
      });
      setPage(targetPage);
      setHasNext(result.has_next);
    } catch (caught) {
      if (requestId !== requestIdRef.current) return;
      setError(caught);
      if (!append) {
        setItems([]);
        setHasNext(false);
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void run(1, false);
    }, 0);
    return () => clearTimeout(timer);
  }, [run]);

  const loadMore = useCallback(() => {
    if (loading || !hasNext) return;
    void run(page + 1, true);
  }, [loading, hasNext, page, run]);

  const reset = useCallback(() => {
    void run(1, false);
  }, [run]);

  return { items, page, hasNext, loading, error, loadMore, reset };
}
