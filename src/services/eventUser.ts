import type { EventUser, ParticipationStatus } from "../types/api";
import { api } from "./api";

// POST /event/:id/participants só aceita estes papéis (o backend responde 400
// para qualquer outro, inclusive HOST/ATTENDEE). Em MENTORING o papel tem de ser
// complementar ao de quem criou (MENTOR quando quem criou é MENTEE).
export type InvitableRole = "MENTOR" | "MENTEE" | "SPEAKER";

// Resposta de aceite/recusa do convite de mentoria: o backend recusa os demais
// status nesta rota ("Status is not valid, use CONFIRMED or REJECTED").
export type DecidableStatus = "CONFIRMED" | "REJECTED";

// O POST não tem body: o participante é o dono do token.
export async function joinEvent(eventId: string): Promise<EventUser> {
  const { data } = await api.post<EventUser>(`/event/${eventId}/join`);
  return data;
}

export async function addParticipant(
  eventId: string,
  input: { userId: string; role: InvitableRole },
): Promise<EventUser> {
  const { data } = await api.post<EventUser>(`/event/${eventId}/participants`, {
    user_id: input.userId,
    role: input.role,
  });
  return data;
}

export async function getParticipants(
  eventId: string,
  status?: ParticipationStatus | "",
  signal?: AbortSignal,
): Promise<EventUser[]> {
  const params = status ? { status } : undefined;
  const { data } = await api.get<EventUser[]>(`/event/${eventId}/participants`, {
    params,
    signal,
  });
  return data;
}

export async function updateParticipantStatus(
  eventId: string,
  userId: string,
  status: DecidableStatus,
  comment?: string,
): Promise<EventUser> {
  const trimmed = (comment ?? "").trim();
  const body: { status: DecidableStatus; comment?: string } = { status };
  // REJECTED exige comment no backend; CONFIRMED só envia quando há texto.
  if (status === "REJECTED" || trimmed) {
    body.comment = trimmed;
  }
  const { data } = await api.put<EventUser>(`/event/${eventId}/participants/${userId}/status`, body);
  return data;
}

// PUT /event/:id/participants/:userId/comment — só o próprio usuário; vazio limpa.
export async function updateParticipantComment(
  eventId: string,
  userId: string,
  comment: string,
): Promise<EventUser> {
  const { data } = await api.put<EventUser>(`/event/${eventId}/participants/${userId}/comment`, {
    comment: comment.trim(),
  });
  return data;
}

// O DELETE responde 200 com o EventUserDto (não 204). O body é tratado como
// opcional para tolerar uma eventual simplificação do backend.
export async function cancelParticipation(
  eventId: string,
  userId: string,
): Promise<EventUser | null> {
  const { data } = await api.delete<EventUser | undefined>(
    `/event/${eventId}/participants/${userId}`,
  );
  return data ?? null;
}
