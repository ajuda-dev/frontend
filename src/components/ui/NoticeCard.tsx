import type { ReactNode } from "react";

const TONE_CLASSES = {
  warning: "border-warning text-warning",
  danger: "border-danger text-danger",
} as const;

export function NoticeCard({
  tone,
  title,
  children,
}: {
  tone: "warning" | "danger";
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      className={`bg-surface flex flex-col gap-1 rounded-lg border px-4 py-3 ${TONE_CLASSES[tone]}`}
    >
      <p className="text-sm font-medium">{title}</p>
      <div className="text-ink text-sm whitespace-pre-line">{children}</div>
    </div>
  );
}
