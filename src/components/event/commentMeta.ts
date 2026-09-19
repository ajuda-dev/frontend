import type { EventUser } from "../../types/api";
import type { BadgeTone } from "../ui/Badge";

export function commentTone(entry: EventUser): "danger" | "warning" | null {
  if (entry.comment_kind === "REJECT" || entry.status === "REJECTED") return "danger";
  if (entry.comment_kind === "RESCHEDULE") return "warning";
  return null;
}

export function commentKindChip(entry: EventUser): string | null {
  if (entry.comment_kind === "REJECT" || entry.status === "REJECTED") return "Recusa";
  if (entry.comment_kind === "RESCHEDULE") return "Reagendamento";
  if (entry.comment_kind === "CANCEL") return "Cancelamento";
  return null;
}

export function commentBorderClass(entry: EventUser): string {
  const tone = commentTone(entry);
  if (!entry.comment) return "border-line";
  if (tone === "danger") return "border-danger";
  if (tone === "warning") return "border-warning";
  return "border-line";
}

export function commentChipTone(entry: EventUser): BadgeTone {
  const tone = commentTone(entry);
  if (tone === "danger") return "danger";
  if (tone === "warning") return "warning";
  return "ink-muted";
}
