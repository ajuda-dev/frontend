import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`bg-surface border-line rounded-lg border p-4 ${className}`} />;
}
