import type { NotificationPayload } from "../types/api";

export interface NotificationStreamEvent {
  id: number;
  type: string;
  payload: NotificationPayload;
}

export type NotificationStreamHandlers = {
  onNotification: (event: NotificationStreamEvent) => void;
  onReady?: () => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
};

export function notificationStreamUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? "/v1";
  const path = "/notifications/stream";
  if (base.startsWith("http://") || base.startsWith("https://")) {
    return `${base.replace(/\/$/, "")}${path}`;
  }
  return `${base}${path}`;
}

function parseId(value: unknown, lastEventId?: string): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const fromString = Number(value);
    if (Number.isFinite(fromString)) return fromString;
  }
  if (lastEventId !== undefined && lastEventId !== "") {
    const fromEventId = Number(lastEventId);
    if (Number.isFinite(fromEventId)) return fromEventId;
  }
  return null;
}

function parsePayload(value: unknown): NotificationPayload {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as NotificationPayload;
  }
  return {};
}

export function parseNotificationStreamData(
  data: string,
  lastEventId?: string,
): NotificationStreamEvent | null {
  try {
    const parsed: unknown = JSON.parse(data);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    const id = parseId(record.id, lastEventId);
    if (id === null || typeof record.type !== "string" || record.type === "") {
      return null;
    }
    return { id, type: record.type, payload: parsePayload(record.payload) };
  } catch {
    console.warn("Frame SSE de notificação inválido");
    return null;
  }
}

export function openNotificationStream(handlers: NotificationStreamHandlers): () => void {
  const url = notificationStreamUrl();
  const crossOrigin = url.startsWith("http://") || url.startsWith("https://");
  const source = new EventSource(url, crossOrigin ? { withCredentials: true } : undefined);

  source.addEventListener("ready", () => handlers.onReady?.());
  source.addEventListener("notification", (ev: MessageEvent<string>) => {
    const parsed = parseNotificationStreamData(ev.data, ev.lastEventId);
    if (parsed) handlers.onNotification(parsed);
  });
  source.onopen = () => handlers.onOpen?.();
  source.onerror = (error) => handlers.onError?.(error);

  return () => source.close();
}
