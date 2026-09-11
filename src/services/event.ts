import type {
  EventCategory,
  EventItem,
  EventType,
  Pageable,
  RegisterEventInput,
} from "../types/api";
import { api, isApiError } from "./api";

export interface ListEventsParams {
  page: number;
  category?: EventCategory | "";
  type?: EventType | "";
  city?: string;
  upcoming?: boolean;
  communityId?: string;
  signal?: AbortSignal;
}

export async function listEvents({
  page,
  category,
  type,
  city,
  upcoming,
  communityId,
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
  const { data } = await api.post<EventItem>("/event/register", body);
  return data;
}

export async function deleteEvent(eventId: string): Promise<void> {
  await api.delete(`/event/${eventId}`);
}
