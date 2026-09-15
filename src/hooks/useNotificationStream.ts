import { useEffect, useRef } from "react";
import {
  openNotificationStream,
  type NotificationStreamHandlers,
} from "../services/notificationStream";

export function useNotificationStream({
  enabled,
  onNotification,
  onReady,
  onError,
  onOpen,
}: { enabled: boolean } & NotificationStreamHandlers): void {
  const handlersRef = useRef({ onNotification, onReady, onError, onOpen });

  useEffect(() => {
    handlersRef.current = { onNotification, onReady, onError, onOpen };
  });

  useEffect(() => {
    if (!enabled) return;
    return openNotificationStream({
      onNotification: (event) => handlersRef.current.onNotification(event),
      onReady: () => handlersRef.current.onReady?.(),
      onError: (error) => handlersRef.current.onError?.(error),
      onOpen: () => handlersRef.current.onOpen?.(),
    });
  }, [enabled]);
}
