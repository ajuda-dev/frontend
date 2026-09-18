import type {
  CreatorRole,
  EventApprovalStatus,
  EventCategory,
  EventItem,
  EventType,
  Pageable,
  ParticipationRole,
  ParticipationStatus,
  RegisterEventInput,
  RescheduleEventInput,
} from "../types/api";
import { api, isApiError } from "./api";

export interface ListEventsParams {
  page: number;
  category?: EventCategory | "";
  type?: EventType | "";
  city?: string;
  upcoming?: boolean;
  communityId?: string;
  // Filtro de aprovação: o backend exige o `community_id` junto (sem ele responde
  // 403, inclusive para o dono da comunidade), então só é enviado em par.
  approvalStatus?: EventApprovalStatus;
  // Recorte da agenda pessoal: o backend junta event_users e filtra por usuário
  // combinado com papel/status da participação.
  userId?: string;
  role?: ParticipationRole;
  status?: ParticipationStatus;
  signal?: AbortSignal;
}

export async function listEvents({
  page,
  category,
  type,
  city,
  upcoming,
  communityId,
  approvalStatus,
  userId,
  role,
  status,
  signal,
}: ListEventsParams): Promise<Pageable<EventItem>> {
  const params: Record<string, string | number | boolean> = { page, limit: 10 };
  if (category) params.category = category;
  if (type) params.type = type;
  const trimmedCity = city?.trim();
  if (trimmedCity) {
    // O backend compara a cidade por igualdade exata (addresses.city = ?), então o
    // termo vai em minúsculas para casar com o valor gravado pelo ViaCEP.
    params.city = trimmedCity.toLowerCase();
  }
  // `upcoming` só é enviado quando ligado: omitido, a API devolve passados e futuros.
  if (upcoming) params.upcoming = true;
  if (communityId) params.community_id = communityId;
  // O par é obrigatório: sem `community_id` o backend responde 403 mesmo para o dono.
  if (approvalStatus && communityId) params.approval_status = approvalStatus;
  if (userId) params.user_id = userId;
  if (role) params.role = role;
  if (status) params.status = status;
  const { data } = await api.get<Pageable<EventItem>>("/event", { params, signal });
  return data;
}

// GET /v1/event/:id (endpoint dedicado do backend): o detalhe resolve em uma
// requisição, com owner, community e address preloadados.
export async function findEventById(id: string, signal?: AbortSignal): Promise<EventItem | null> {
  try {
    const { data } = await api.get<EventItem>(`/event/${id}`, { signal });
    return data;
  } catch (error) {
    // 404 = inexistente ou removido: a página mostra o estado "não encontrado".
    if (isApiError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export interface CreateEventInput {
  title: string;
  description: string;
  category: EventCategory;
  type: EventType;
  start_at: string;
  duration_min: number;
  meeting_link?: string;
  max_slots?: number | null;
  community_id?: string;
  address_id?: string;
  // Só MENTORING: o papel de quem cria no 1:1 (o convidado recebe o complementar).
  creator_role?: CreatorRole;
}

// POST /v1/event/register. Campos opcionais vazios são omitidos do body: o backend
// rejeita `address_id` em eventos ONLINE e trata `max_slots` nulo como "sem limite".
export async function createEvent(input: CreateEventInput): Promise<EventItem> {
  const body: RegisterEventInput = {
    title: input.title,
    description: input.description,
    category: input.category,
    type: input.type,
    start_at: input.start_at,
    duration_min: input.duration_min,
  };
  const meetingLink = input.meeting_link?.trim();
  if (meetingLink) body.meeting_link = meetingLink;
  if (input.max_slots != null) body.max_slots = input.max_slots;
  if (input.community_id) body.community_id = input.community_id;
  // ONLINE nunca leva endereço: o backend responde 400 se o campo vier preenchido.
  if (input.address_id && input.type !== "ONLINE") body.address_id = input.address_id;
  // `creator_role` fora de MENTORING é 400: a chave só sai quando é válida.
  if (input.category === "MENTORING" && input.creator_role) body.creator_role = input.creator_role;
  const { data } = await api.post<EventItem>("/event/register", body);
  return data;
}

export async function deleteEvent(eventId: string, comment: string): Promise<void> {
  await api.delete(`/event/${eventId}`, { data: { comment: comment.trim() } });
}

// PUT /v1/event/:id/reschedule — troca start_at e grava comment no event_users
// de quem reagenda (comment_kind=RESCHEDULE). Em MENTORING a API confirma quem
// reagendou e devolve o outro para REQUESTED; a resposta não traz event_users,
// então a página precisa refetch dos participantes.
export async function rescheduleEvent(
  eventId: string,
  input: { startAt: string; comment: string },
): Promise<EventItem> {
  const body: RescheduleEventInput = {
    start_at: input.startAt,
    comment: input.comment.trim(),
  };
  const { data } = await api.put<EventItem>(`/event/${eventId}/reschedule`, body);
  return data;
}

// PUT /v1/event/:id/approval — só o dono da comunidade (ou ≥ MODERATOR) aprova; o
// criador do evento não. Transições válidas: PENDING → APPROVED|REJECTED e
// REJECTED → APPROVED (o resto é 400). A resposta já traz o evento atualizado.
export async function approveEvent(
  eventId: string,
  status: Extract<EventApprovalStatus, "APPROVED" | "REJECTED">,
): Promise<EventItem> {
  const { data } = await api.put<EventItem>(`/event/${eventId}/approval`, { status });
  return data;
}
