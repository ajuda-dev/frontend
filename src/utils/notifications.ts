import { isNotificationType, type Notification } from "../types/api";

function eventTitle(notification: Notification): string | undefined {
  const title = notification.payload.title?.trim();
  return title || undefined;
}

export function notificationTitle(notification: Notification): string {
  if (notification.type === "COMMUNITY_EVENT_PENDING_APPROVAL") {
    const title = eventTitle(notification);
    if (title) return `${title} aguarda a sua aprovação`;
    return "Um evento da comunidade aguarda a sua aprovação";
  }
  if (notification.type === "COMMUNITY_EVENT_APPROVED") {
    const title = eventTitle(notification);
    if (title) return `${title} foi aprovado`;
    return "Seu evento da comunidade foi aprovado";
  }
  if (notification.type === "COMMUNITY_EVENT_REJECTED") {
    const title = eventTitle(notification);
    if (title) return `${title} foi recusado`;
    return "Seu evento da comunidade foi recusado";
  }
  if (notification.type === "MENTORING_INVITE_PENDING") {
    return "Você recebeu um convite de mentoria 1:1";
  }
  if (notification.type === "MENTORING_INVITE_ACCEPTED") {
    const title = eventTitle(notification);
    if (title) return `O convite de mentoria ${title} foi aceito`;
    return "Um convite de mentoria 1:1 foi aceito";
  }
  if (notification.type === "MENTORING_INVITE_REJECTED") {
    const title = eventTitle(notification);
    if (title) return `O convite de mentoria ${title} foi recusado`;
    return "Um convite de mentoria 1:1 foi recusado";
  }
  if (notification.type === "MENTORING_INVITE_RESCHEDULED") {
    const title = eventTitle(notification);
    if (title) return `A mentoria ${title} foi reagendada`;
    return "Uma mentoria 1:1 foi reagendada";
  }
  if (notification.type === "SPEAKER_INVITE_PENDING") {
    const title = eventTitle(notification);
    if (title) return `Você foi convidado para palestrar em ${title}`;
    return "Você foi convidado para palestrar";
  }
  if (notification.type === "SPEAKER_INVITE_ACCEPTED") {
    const title = eventTitle(notification);
    if (title) return `O convite para palestrar em ${title} foi aceito`;
    return "Um convite para palestrar foi aceito";
  }
  if (notification.type === "SPEAKER_INVITE_REJECTED") {
    const title = eventTitle(notification);
    if (title) return `O convite para palestrar em ${title} foi recusado`;
    return "Um convite para palestrar foi recusado";
  }
  if (notification.type === "SPEAKER_INVITE_RESCHEDULED") {
    const title = eventTitle(notification);
    if (title) return `O evento ${title} foi reagendado`;
    return "Um evento foi reagendado";
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
