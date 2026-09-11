import type { EventCategory, EventItem, EventType, Pageable } from "../types/api";
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
