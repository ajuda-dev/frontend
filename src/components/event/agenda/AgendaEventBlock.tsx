import type { CSSProperties } from "react";
import { Link } from "react-router";
import type { AgendaEvent } from "../../../hooks/useAgendaEvents";
import { formatTime } from "../../../utils/format";
import { EVENT_CATEGORY_COLOR } from "../../../utils/labels";

const TONE_BLOCK: Record<string, string> = {
  brand: "bg-brand-soft border-brand text-brand",
  info: "bg-surface-2 border-info text-info",
  warning: "bg-surface-2 border-warning text-warning",
  danger: "bg-surface-2 border-danger text-danger",
  "ink-muted": "bg-surface-2 border-line text-ink",
};

interface AgendaEventBlockProps {
  event: AgendaEvent;
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function AgendaEventBlock({ event, compact = false, className = "", style }: AgendaEventBlockProps) {
  const tone = EVENT_CATEGORY_COLOR[event.category];
  const pending = event.participationStatus === "REQUESTED";
  const palette = pending ? TONE_BLOCK.warning : TONE_BLOCK[tone];
  const borderStyle = pending ? "border-dashed" : "border-solid";

  return (
    <Link
      to={`/eventos/${event.id}`}
      state={{ event }}
      title={event.title}
      className={`overflow-hidden rounded-sm border px-1.5 py-0.5 text-left text-xs leading-tight ${palette} ${borderStyle} ${className}`}
      style={style}
    >
      <span className="block truncate font-medium">{event.title}</span>
      {compact ? null : <span className="block truncate opacity-80">{formatTime(event.start_at)}</span>}
    </Link>
  );
}
