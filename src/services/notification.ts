import type { Notification, NotificationInboxStatus, Pageable } from "../types/api";
import { api } from "./api";

type NotificationDto = Omit<Notification, "read_at" | "payload"> & {
  payload?: Notification["payload"];
  read_at?: string | null;
};

function normalizeNotification(item: NotificationDto): Notification {
  return {
    ...item,
    payload: item.payload ?? {},
    read_at: item.read_at ?? null,
  };
}

export async function listNotifications({
  page,
  limit = 10,
  status = "unread",
  signal,
}: {
  page: number;
  limit?: number;
  status?: NotificationInboxStatus;
  signal?: AbortSignal;
}): Promise<Pageable<Notification>> {
  const { data } = await api.get<Pageable<NotificationDto>>("/notifications", {
    params: { page, limit, status },
    signal,
  });
  return {
    data: (data.data ?? []).map(normalizeNotification),
    has_next: data.has_next,
  };
}

export async function markNotificationRead(id: number): Promise<Notification> {
  const { data } = await api.put<NotificationDto>(`/notifications/${id}/read`);
  return normalizeNotification(data);
}
