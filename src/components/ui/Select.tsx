import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function Select({ invalid = false, className = "", children, ...props }: SelectProps) {
  const border = invalid ? "border-danger" : "border-line focus:border-brand";
  return (
    <select
      {...props}
      aria-invalid={invalid || undefined}
      className={`bg-surface-2 text-ink w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors ${border} ${className}`}
    >
      {children}
    </select>
  );
}
