import type { CreatorRole, EventItem, ParticipationRole, ParticipationStatus, UserRole } from "../types/api";
import { canAtLeast } from "./roles";

// Espelha isEventApproved do backend (event_authorization.go): status vazio ou ausente
// conta como aprovado; só PENDING/REJECTED bloqueiam participação e visibilidade.
export function isEventApproved(event: Pick<EventItem, "status">): boolean {
  return !event.status || event.status === "APPROVED";
}

// Espelha complementaryRole do validador de convite: o convidado do 1:1 sempre recebe
// o papel oposto ao de quem criou (event_user_validator.go).
export function complementaryRole(role: CreatorRole): CreatorRole {
  return role === "MENTOR" ? "MENTEE" : "MENTOR";
}

// Espelha canManageEvent do backend (event_authorization.go): criador do evento,
// dono da comunidade do evento ou ≥ MODERATOR. É o gate de convidar/remover
// participante e de excluir o evento.
export function canManageEvent(
  event: Pick<EventItem, "owner" | "community">,
  user: { id: string; role: UserRole } | null | undefined,
): boolean {
  if (!user) return false;
  return (
    event.owner?.id === user.id ||
    event.community?.owner?.id === user.id ||
    canAtLeast(user.role, "MODERATOR")
  );
}

// Espelha canRescheduleEvent do backend: quem gerencia sempre pode; o convidado
// com linha não CANCELLED também — em MENTORING qualquer papel, nos demais só SPEAKER
// (REQUESTED/CONFIRMED/REJECTED; a API aceita contra-proposta de quem recusou).
export function canRescheduleEvent(
  event: Pick<EventItem, "owner" | "community" | "category">,
  user: { id: string; role: UserRole } | null | undefined,
  myRow: { status: ParticipationStatus; role?: ParticipationRole } | null | undefined,
): boolean {
  if (canManageEvent(event, user)) return true;
  if (!myRow || myRow.status === "CANCELLED") return false;
  if (event.category === "MENTORING") return true;
  return myRow.role === "SPEAKER";
}
