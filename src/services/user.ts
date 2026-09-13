import type {
  Pageable,
  SkillUser,
  UpdateUserInput,
  UserProfile,
  UserSummary,
  UserWithSkills,
} from "../types/api";
import { api, isApiError } from "./api";

export interface ListUsersParams {
  page: number;
  skill?: string;
  name?: string;
  signal?: AbortSignal;
}

export async function listUsers({
  page,
  skill,
  name,
  signal,
}: ListUsersParams): Promise<Pageable<UserWithSkills>> {
  const params: Record<string, string | number> = { page, limit: 10 };
  const trimmedSkill = skill?.trim();
  if (trimmedSkill) {
    params.skill = trimmedSkill;
  }
  const trimmedName = name?.trim();
  if (trimmedName) {
    params.name = trimmedName;
  }
  const { data } = await api.get<Pageable<UserWithSkills>>("/user", { params, signal });
  return data;
}

export async function getUserProfile(
  userId: string,
  signal?: AbortSignal,
): Promise<UserProfile | null> {
  try {
    const { data } = await api.get<UserProfile>(`/user/${userId}`, { signal });
    return data;
  } catch (error) {
    // 404 = inexistente ou arquivado (soft delete).
    if (isApiError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function getUserSkills(
  userId: string,
  signal?: AbortSignal,
): Promise<SkillUser[]> {
  const { data } = await api.get<SkillUser[]>(`/user/${userId}/skills`, { signal });
  return data;
}

export async function removeUserSkill(userId: string, skillId: string): Promise<void> {
  await api.delete(`/user/${userId}/skills/${skillId}`);
}

export async function deleteUser(userId: string): Promise<void> {
  await api.delete(`/user/${userId}`);
}

export async function updateUserName(userId: string, name: string): Promise<UserSummary> {
  // Só `name`: o backend recusa o body inteiro se vier `email` (plano 13, decisão 3).
  const body: UpdateUserInput = { name };
  const { data } = await api.put<UserSummary>(`/user/${userId}`, body);
  return data;
}

export async function updateUserProfile(
  userId: string,
  input: UpdateUserInput,
): Promise<UserSummary> {
  // O body chega pronto (diff montado pela página): o backend faz merge por chave
  // e recusa `email`/`password` fora de `configVisibility` (plano 16, decisão 3).
  const { data } = await api.put<UserSummary>(`/user/${userId}`, input);
  return data;
}
