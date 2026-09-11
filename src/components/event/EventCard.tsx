import { Link } from "react-router";
import type { EventItem } from "../../types/api";
import { formatDateTime } from "../../utils/format";
import { EVENT_CATEGORY_COLOR, EVENT_CATEGORY_LABEL, EVENT_TYPE_LABEL } from "../../utils/labels";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";

interface EventCardProps {
  event: EventItem;
  compact?: boolean;
}

function eventLocation(event: EventItem): string {
  if (event.type === "ONLINE") return "Online";
  if (event.address) return `${event.address.city}/${event.address.state}`;
  return "Local a confirmar";
}

export function EventCard({ event, compact = false }: EventCardProps) {
  const detailLink = (
    <Link to={`/eventos/${event.id}`} state={{ event }} className="text-brand text-sm hover:underline">
      Ver detalhes
    </Link>
  );

  if (compact) {
    return (
      <Card className="flex flex-col gap-2">
        <h3 className="text-ink text-sm font-semibold">
          <Link to={`/eventos/${event.id}`} state={{ event }} className="hover:text-brand">
            {event.title}
          </Link>
        </h3>
        <p className="text-ink-muted text-xs">{formatDateTime(event.start_at)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={EVENT_CATEGORY_COLOR[event.category]}>
            {EVENT_CATEGORY_LABEL[event.category]}
          </Badge>
          <Badge tone="ink-muted">{EVENT_TYPE_LABEL[event.type]}</Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-ink text-base font-semibold">
          <Link to={`/eventos/${event.id}`} state={{ event }} className="hover:text-brand">
            {event.title}
          </Link>
        </h2>
        <Badge tone={EVENT_CATEGORY_COLOR[event.category]}>
          {EVENT_CATEGORY_LABEL[event.category]}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="ink-muted">{EVENT_TYPE_LABEL[event.type]}</Badge>
      </div>

      <dl className="text-ink-muted flex flex-col gap-1 text-xs">
        <div className="flex gap-1">
          <dt className="sr-only">Data e hora</dt>
          <dd>{formatDateTime(event.start_at)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="sr-only">Local</dt>
          <dd>{eventLocation(event)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="sr-only">Duração</dt>
          <dd>{event.duration_min} min</dd>
        </div>
        <div className="flex gap-1">
          <dt className="sr-only">Organizado por</dt>
          <dd>por {event.owner?.name ?? "responsável não informado"}</dd>
        </div>
      </dl>

      {detailLink}
    </Card>
  );
}
