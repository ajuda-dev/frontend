import { Link } from "react-router";
import type { EventUser } from "../../types/api";
import { PARTICIPATION_ROLE_COLOR, PARTICIPATION_ROLE_LABEL } from "../../utils/labels";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { commentBorderClass, commentChipTone, commentKindChip } from "./commentMeta";

interface ParticipantCommentProps {
  entry: EventUser;
}

export function ParticipantComment({ entry }: ParticipantCommentProps) {
  if (!entry.comment) {
    return null;
  }

  const name = entry.user?.name ?? "Participante";
  const chip = commentKindChip(entry);

  return (
    <article
      role="status"
      className={`bg-surface flex gap-3 rounded-md border px-3 py-2 ${commentBorderClass(entry)}`}
    >
      <Avatar name={name} src={entry.user?.photo} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/pessoas/${entry.user_id}`}
            className="text-ink hover:text-brand text-sm font-medium"
          >
            {name}
          </Link>
          <Badge tone={PARTICIPATION_ROLE_COLOR[entry.role]}>
            {PARTICIPATION_ROLE_LABEL[entry.role]}
          </Badge>
          {chip ? <Badge tone={commentChipTone(entry)}>{chip}</Badge> : null}
        </div>
        <p className="text-ink mt-1 text-sm whitespace-pre-line">{entry.comment}</p>
      </div>
    </article>
  );
}
