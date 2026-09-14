import type { CreatorRole, EventItem } from "../types/api";

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
