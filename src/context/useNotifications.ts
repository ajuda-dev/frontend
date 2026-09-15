import { createContext, useContext } from "react";
import type { Notification } from "../types/api";

export interface NotificationContextValue {
  items: Notification[];
  unreadLabel: string;
  hasNext: boolean;
  loading: boolean;
  error: unknown;
  loadMore: () => void;
  retry: () => void;
  markReadAndOpen: (notification: Notification) => void;
  streamReady: boolean;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications deve ser usado dentro de NotificationProvider");
  }
  return context;
}
