import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { useNotificationStream } from "../hooks/useNotificationStream";
import { isApiError } from "../services/api";
import { listNotifications, markNotificationRead } from "../services/notification";
import type { NotificationStreamEvent } from "../services/notificationStream";
import type { Notification, Pageable } from "../types/api";
import { mergeNotifications, notificationHref, unreadBadgeLabel } from "../utils/notifications";
import { NotificationContext } from "./useNotifications";
import { useAuth } from "./useAuth";

const EMPTY_ITEMS: Notification[] = [];

function toLiveNotification(event: NotificationStreamEvent): Notification {
  return {
    id: event.id,
    type: event.type,
    payload: event.payload,
    created_at: new Date().toISOString(),
    read_at: null,
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const enabled = Boolean(user);

  const [items, setItems] = useState<Notification[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [streamReady, setStreamReady] = useState(false);

  const requestIdRef = useRef(0);
  const userId = user?.id;

  const applyPage = useCallback(
    (result: Pageable<Notification>, mode: "replace" | "merge" | "append") => {
      setItems((previous) => {
        if (mode === "append") return mergeNotifications(previous, result.data);
        if (mode === "merge") return mergeNotifications(result.data, previous);
        return mergeNotifications(result.data, []);
      });
      setHasNext(result.has_next);
    },
    [],
  );

  const fetchUnread = useCallback(
    async (targetPage: number, mode: "replace" | "merge" | "append", signal?: AbortSignal) => {
      if (!userId) return;
      const requestId = ++requestIdRef.current;
      setLoading(true);
      if (mode !== "append") setError(null);
      try {
        const result = await listNotifications({
          page: targetPage,
          status: "unread",
          signal,
        });
        if (requestId !== requestIdRef.current) return;
        applyPage(result, mode);
        setPage(targetPage);
      } catch (caught) {
        if (signal?.aborted || requestId !== requestIdRef.current) return;
        setError(caught);
        if (mode !== "append") {
          setItems([]);
          setHasNext(false);
          setPage(1);
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [applyPage, userId],
  );

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetchUnread(1, "replace", controller.signal);
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
      requestIdRef.current += 1;
    };
  }, [fetchUnread, userId]);

  const onNotification = useCallback((event: NotificationStreamEvent) => {
    setItems((previous) => {
      if (previous.some((item) => item.id === event.id)) return previous;
      return mergeNotifications([toLiveNotification(event)], previous);
    });
  }, []);

  const onOpen = useCallback(() => {
    void fetchUnread(1, "merge");
  }, [fetchUnread]);

  const onError = useCallback((error: Event) => {
    const source = error.target;
    if (source instanceof EventSource && source.readyState === EventSource.CLOSED) {
      void listNotifications({ page: 1, status: "unread" }).catch(() => undefined);
    }
  }, []);

  useNotificationStream({
    enabled,
    onNotification,
    onOpen,
    onReady: () => setStreamReady(true),
    onError,
  });

  const loadMore = useCallback(() => {
    if (loading || !hasNext) return;
    void fetchUnread(page + 1, "append");
  }, [fetchUnread, hasNext, loading, page]);

  const retry = useCallback(() => {
    void fetchUnread(1, "replace");
  }, [fetchUnread]);

  const markReadAndOpen = useCallback(
    (notification: Notification) => {
      setItems((previous) => previous.filter((item) => item.id !== notification.id));
      setActionError(null);
      const href = notificationHref(notification);
      if (href) navigate(href);

      void markNotificationRead(notification.id).catch((caught: unknown) => {
        if (isApiError(caught) && caught.response?.status === 404) return;
        setItems((previous) => mergeNotifications([notification], previous));
        setActionError(caught);
      });
    },
    [navigate],
  );

  const unreadItems = userId ? items : EMPTY_ITEMS;
  const unreadHasNext = userId ? hasNext : false;
  const unreadLabel = unreadBadgeLabel(unreadItems.length, unreadHasNext);
  const panelError = userId ? (actionError ?? error) : null;

  const value = useMemo(
    () => ({
      items: unreadItems,
      unreadLabel,
      hasNext: unreadHasNext,
      loading: userId ? loading : false,
      error: panelError,
      loadMore,
      retry,
      markReadAndOpen,
      streamReady: userId ? streamReady : false,
    }),
    [
      loadMore,
      loading,
      markReadAndOpen,
      panelError,
      retry,
      streamReady,
      unreadHasNext,
      unreadItems,
      unreadLabel,
      userId,
    ],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
