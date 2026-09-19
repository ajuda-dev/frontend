import type { Community, CommunityLinks, CommunityUser, Pageable, UpdateCommunityInput } from "../types/api";
import { api, isApiError } from "./api";

export interface ListCommunitiesParams {
  page: number;
  city?: string;
  name?: string;
  ownerId?: string;
  signal?: AbortSignal;
}

export async function listCommunities({
  page,
  city,
  name,
  ownerId,
  signal,
}: ListCommunitiesParams): Promise<Pageable<Community>> {
  const params: Record<string, string | number> = { page, limit: 10 };
  const trimmedCity = city?.trim();
  if (trimmedCity) {
    // O backend busca a cidade por substring, ignorando caixa e acentos
    // (unaccent(addresses.city) LIKE unaccent(?)), então o termo pode ir como digitado.
    params.city = trimmedCity.toLowerCase();
  }
  const trimmedName = name?.trim();
  if (trimmedName) {
    params.name = trimmedName.toLowerCase();
  }
  if (ownerId) {
    // Recorte "minhas comunidades": o backend filtra community.owner_id.
    params.owner_id = ownerId;
  }
  const { data } = await api.get<Pageable<Community>>("/community", { params, signal });
  return data;
}

// GET /v1/user/:userId/communities (plano 29 do backend): comunidades em que o
// usuário é membro. Não inclui as próprias (o dono não tem membership) e não tem
// filtro de nome.
export async function listUserCommunities({
  userId,
  page,
  signal,
}: {
  userId: string;
  page: number;
  signal?: AbortSignal;
}): Promise<Pageable<Community>> {
  const { data } = await api.get<Pageable<Community>>(`/user/${userId}/communities`, {
    params: { page, limit: 10 },
    signal,
  });
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
  configVisibility?: CommunityLinks;
}

export async function createCommunity(input: CreateCommunityInput): Promise<Community> {
  const { data } = await api.post<Community>("/community/register", input);
  return data;
}

export async function updateCommunity(
  communityId: string,
  input: UpdateCommunityInput,
): Promise<Community> {
  const { data } = await api.put<Community>(`/community/${communityId}`, input);
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
