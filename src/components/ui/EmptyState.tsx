import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="border-line bg-surface flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
      <span aria-hidden="true" className="font-mono text-brand text-2xl">
        {"{ }"}
      </span>
      <p className="text-ink font-medium">{title}</p>
      {description ? <p className="text-ink-muted max-w-md text-sm">{description}</p> : null}
      {action}
    </div>
  );
}
