import type { EventItem } from "../../types/api";
import { isEventApproved } from "../../utils/events";
import { EVENT_APPROVAL_STATUS_COLOR, EVENT_APPROVAL_STATUS_LABEL } from "../../utils/labels";
import { Badge } from "../ui/Badge";

// Evento aprovado (ou sem status, que o backend trata como aprovado) não precisa de
// badge: só PENDING/REJECTED mudam o que o usuário vê.
export function EventApprovalBadge({ event }: { event: Pick<EventItem, "status"> }) {
  const status = event.status;
  if (!status || isEventApproved(event)) return null;
  return (
    <Badge tone={EVENT_APPROVAL_STATUS_COLOR[status]}>{EVENT_APPROVAL_STATUS_LABEL[status]}</Badge>
  );
}
