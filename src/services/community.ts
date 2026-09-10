import type { Community, CommunityUser, Pageable } from "../types/api";
import { api } from "./api";

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

export async function leaveCommunity(communityId: string): Promise<void> {
  await api.delete(`/community/${communityId}/leave`);
}

const SEARCH_PAGE_LIMIT = 100;
const SEARCH_MAX_PAGES = 20;

// Não existe GET /v1/community/:id no backend: o detalhe por acesso direto
// percorre as páginas da listagem até encontrar a comunidade.
export async function findCommunityById(
  id: string,
  signal?: AbortSignal,
): Promise<Community | null> {
  for (let page = 1; page <= SEARCH_MAX_PAGES; page += 1) {
    const { data } = await api.get<Pageable<Community>>("/community", {
      params: { page, limit: SEARCH_PAGE_LIMIT },
      signal,
    });
    const found = data.data.find((community) => community.id === id);
    if (found) return found;
    if (!data.has_next) return null;
  }
  return null;
}
