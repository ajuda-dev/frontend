import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ invalid = false, className = "", ...props }: TextareaProps) {
  const border = invalid ? "border-danger" : "border-line focus:border-brand";
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      className={`bg-surface-2 text-ink placeholder:text-ink-muted w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors ${border} ${className}`}
    />
  );
}
