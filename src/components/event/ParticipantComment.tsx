import type { EventCategory, EventUser } from "../../types/api";
import { NoticeCard } from "../ui/NoticeCard";

interface ParticipantCommentProps {
  entry: EventUser;
  category: EventCategory;
}

export function ParticipantComment({ entry, category }: ParticipantCommentProps) {
  if (!entry.comment) {
    return null;
  }
  if (entry.comment_kind === "REJECT" || entry.status === "REJECTED") {
    return (
      <NoticeCard tone="danger" title="Motivo da recusa">
        {entry.comment}
      </NoticeCard>
    );
  }
  if (entry.comment_kind === "RESCHEDULE") {
    return (
      <NoticeCard
        tone="warning"
        title={category === "MENTORING" ? "Mentoria reagendada" : "Evento reagendado"}
      >
        {entry.comment}
      </NoticeCard>
    );
  }
  return <p className="text-ink-muted text-xs whitespace-pre-line">{entry.comment}</p>;
}
