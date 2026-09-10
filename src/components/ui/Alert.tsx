import type { ReactNode } from "react";

export type AlertVariant = "error" | "success" | "info";

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  error: "border-danger text-danger",
  success: "border-brand text-brand",
  info: "border-info text-info",
};

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function Alert({ variant = "error", title, children, action }: AlertProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`bg-surface flex flex-col gap-2 rounded-md border px-4 py-3 text-sm ${VARIANT_CLASSES[variant]}`}
    >
      <div className="flex flex-col gap-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="text-ink-muted">{children}</div> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
