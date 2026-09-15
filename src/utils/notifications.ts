import { isNotificationType, type Notification } from "../types/api";

export function notificationTitle(notification: Notification): string {
  if (notification.type === "COMMUNITY_EVENT_PENDING_APPROVAL") {
    const title = notification.payload.title?.trim();
    if (title) return `${title} aguarda a sua aprovação`;
    return "Um evento da comunidade aguarda a sua aprovação";
  }
  if (notification.type === "MENTORING_INVITE_PENDING") {
    return "Você recebeu um convite de mentoria 1:1";
  }
  return "Aviso";
}

export function notificationHref(notification: Notification): string | null {
  const eventId = notification.payload.event_id;
  if (!eventId) return null;
  return `/eventos/${eventId}`;
}

export function mergeNotifications(
  primary: Notification[],
  secondary: Notification[],
): Notification[] {
  const byId = new Map<number, Notification>();
  for (const item of secondary) byId.set(item.id, item);
  for (const item of primary) byId.set(item.id, item);

  return [...byId.values()]
    .filter((item) => isNotificationType(item.type) && item.read_at == null)
    .sort((a, b) => {
      const byDate = b.created_at.localeCompare(a.created_at);
      if (byDate !== 0) return byDate;
      return b.id - a.id;
    });
}

export function unreadBadgeLabel(count: number, hasNext: boolean): string {
  if (count <= 0) return "";
  if (count > 99) return "99+";
  if (hasNext) return `${count}+`;
  return String(count);
}
