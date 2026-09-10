type SpinnerSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-4",
};

export function Spinner({ size = "md", className = "" }: { size?: SpinnerSize; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Carregando"
      className={`border-line border-t-brand inline-block animate-spin rounded-full ${SIZE_CLASSES[size]} ${className}`}
    />
  );
}

export function InlineSpinner({ size = "sm", className = "" }: { size?: SpinnerSize; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`border-line border-t-brand inline-block animate-spin rounded-full ${SIZE_CLASSES[size]} ${className}`}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  );
}
