import { useState } from "react";

interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "h-10 w-10 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-20 w-20 text-2xl",
} as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Avatar({ name, src, size = "md" }: AvatarProps) {
  // Guarda o src que falhou: trocar a URL volta a tentar a imagem sem precisar de efeito.
  const [failedSrc, setFailedSrc] = useState<string | undefined>(undefined);

  const showImage = Boolean(src) && src !== failedSrc;

  return (
    <span
      className={`bg-surface-2 border-line text-ink-muted inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border font-semibold ${SIZE_CLASSES[size]}`}
    >
      {showImage ? (
        <img
          src={src}
          alt={`Foto de ${name}`}
          className="h-full w-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
