import type { ReactNode } from "react";

export type BadgeTone = "brand" | "info" | "warning" | "danger" | "ink-muted";

const TONE_CLASSES: Record<BadgeTone, string> = {
  brand: "bg-brand-soft text-brand border-brand",
  info: "bg-surface-2 text-info border-info",
  warning: "bg-surface-2 text-warning border-warning",
  danger: "bg-surface-2 text-danger border-danger",
  "ink-muted": "bg-surface-2 text-ink-muted border-line",
};

export function Badge({ tone = "ink-muted", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
