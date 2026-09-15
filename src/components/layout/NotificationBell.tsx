import { useEffect, useId, useRef } from "react";
import { useLocation } from "react-router";
import { useNotifications } from "../../context/useNotifications";
import { apiErrorMessage } from "../../utils/apiError";
import { formatDateTime } from "../../utils/format";
import { notificationTypeLabel } from "../../utils/labels";
import { notificationTitle } from "../../utils/notifications";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
      <path d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  );
}

function bellAriaLabel(count: number, hasNext: boolean): string {
  if (count <= 0) return "Notificações, nenhuma não lida";
  if (hasNext || count > 99) {
    const shown = Math.min(count, 99);
    return `Notificações, ${shown} ou mais não lidas`;
  }
  if (count === 1) return "Notificações, 1 não lida";
  return `Notificações, ${count} não lidas`;
}

interface NotificationBellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationBell({ open, onOpenChange }: NotificationBellProps) {
  const { items, unreadLabel, hasNext, loading, error, loadMore, retry, markReadAndOpen } =
    useNotifications();
  const location = useLocation();
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef(location.pathname);

  useEffect(() => {
    if (pathRef.current === location.pathname) return;
    pathRef.current = location.pathname;
    onOpenChange(false);
  }, [location.pathname, onOpenChange]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
        buttonRef.current?.focus();
      }
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      onOpenChange(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onOpenChange, open]);

  function toggle() {
    const next = !open;
    onOpenChange(next);
    if (next) retry();
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={bellAriaLabel(items.length, hasNext)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className="text-ink hover:bg-surface-2 relative rounded-md p-2"
      >
        <BellIcon />
        {unreadLabel ? (
          <span
            aria-hidden="true"
            className="bg-brand text-bg absolute -top-0.5 -right-0.5 min-w-4 rounded-full px-1 text-center text-[10px] leading-4 font-semibold"
          >
            {unreadLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Notificações"
          className="bg-surface border-line absolute right-0 z-50 mt-2 max-h-64 w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-md border p-2 shadow-lg"
        >
          {error ? (
            <Alert
              variant="error"
              title={apiErrorMessage(error)}
              action={
                <Button type="button" variant="secondary" size="sm" onClick={retry}>
                  Tentar novamente
                </Button>
              }
            />
          ) : null}

          {loading && items.length === 0 && !error ? (
            <div className="flex justify-center py-6">
              <Spinner size="sm" />
            </div>
          ) : null}

          {!loading && items.length === 0 && !error ? (
            <p className="text-ink-muted px-2 py-6 text-center text-sm">Nenhuma notificação por agora.</p>
          ) : null}

          {items.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {items.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      markReadAndOpen(notification);
                    }}
                    className="hover:bg-surface-2 flex w-full flex-col items-start gap-1 rounded-md px-2 py-2 text-left"
                  >
                    <Badge tone="brand">{notificationTypeLabel(notification.type)}</Badge>
                    <span className="text-ink text-sm">{notificationTitle(notification)}</span>
                    <span className="text-ink-muted text-xs">{formatDateTime(notification.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {hasNext ? (
            <div className="flex justify-center pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={loadMore} disabled={loading}>
                Carregar mais
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
