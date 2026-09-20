import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  titleAccessory?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, titleAccessory, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-ink text-xl font-semibold">{title}</h1>
          {titleAccessory}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {description ? <p className="text-ink-muted text-sm">{description}</p> : null}
    </header>
  );
}
