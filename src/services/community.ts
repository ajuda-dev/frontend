import type { Community, CommunityUser, Pageable } from "../types/api";
import { api, isApiError } from "./api";

export interface ListCommunitiesParams {
  page: number;
  city?: string;
  signal?: AbortSignal;
}

export async function listCommunities({
  page,
  city,
  signal,
}: ListCommunitiesParams): Promise<Pageable<Community>> {
  const params: Record<string, string | number> = { page, limit: 10 };
  const trimmedCity = city?.trim();
  if (trimmedCity) {
    // O backend busca a cidade por substring (addresses.city LIKE %city%), então o
    // termo vai em minúsculas para casar com o valor gravado pelo ViaCEP.
    params.city = trimmedCity.toLowerCase();
  }
  const { data } = await api.get<Pageable<Community>>("/community", { params, signal });
  return data;
}

export async function joinCommunity(communityId: string): Promise<CommunityUser> {
  const { data } = await api.post<CommunityUser>(`/community/${communityId}/join`);
  return data;
}

export interface CreateCommunityInput {
  name: string;
  description: string;
  address_id: string;
}

export async function createCommunity(input: CreateCommunityInput): Promise<Community> {
  const { data } = await api.post<Community>("/community/register", input);
  return data;
}

export async function deleteCommunity(communityId: string): Promise<void> {
  await api.delete(`/community/${communityId}`);
}

export async function leaveCommunity(communityId: string): Promise<void> {
  await api.delete(`/community/${communityId}/leave`);
}

// GET /v1/community/:id (endpoint dedicado do backend): o detalhe resolve em uma
// requisição. Antes dele, a busca varria a listagem página a página (limit 100).
export async function findCommunityById(
  id: string,
  signal?: AbortSignal,
): Promise<Community | null> {
  try {
    const { data } = await api.get<Community>(`/community/${id}`, { signal });
    return data;
  } catch (error) {
    // 404 = inexistente ou soft-deletada: a página mostra o estado "não encontrada".
    if (isApiError(error) && error.response?.status === 404) return null;
    throw error;
  }
}
