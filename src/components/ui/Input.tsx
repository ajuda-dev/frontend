import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ invalid = false, className = "", ...props }: InputProps) {
  const border = invalid ? "border-danger" : "border-line focus:border-brand";
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={`bg-surface-2 text-ink placeholder:text-ink-muted w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors ${border} ${className}`}
    />
  );
}
