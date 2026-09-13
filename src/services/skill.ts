import type { Pageable, Skill, SkillLevel, SkillUser } from "../types/api";
import { api, isApiError } from "./api";

export interface ListSkillsParams {
  page: number;
  name?: string;
  signal?: AbortSignal;
}

// O backend normaliza o termo para caixa alta e filtra por PREFIXO
// (name LIKE 'TERMO%' em skill_repository.go), então "go" acha "GOLANG" mas
// "lang" não acha nada. O catálogo avisa isso no hint do campo de busca.
export async function listSkills({
  page,
  name,
  signal,
}: ListSkillsParams): Promise<Pageable<Skill>> {
  const params: Record<string, string | number> = { page, limit: 10 };
  const trimmedName = name?.trim();
  if (trimmedName) {
    params.name = trimmedName;
  }
  const { data } = await api.get<Pageable<Skill>>("/skill", { params, signal });
  return data;
}

export async function findSkillById(id: string, signal?: AbortSignal): Promise<Skill | null> {
  try {
    const { data } = await api.get<Skill>(`/skill/${id}`, { signal });
    return data;
  } catch (error) {
    // 404 = inexistente ou arquivada (soft delete).
    if (isApiError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function createSkill(name: string): Promise<Skill> {
  const { data } = await api.post<Skill>("/skill/register", { name });
  return data;
}

export async function updateSkill(id: string, name: string): Promise<Skill> {
  const { data } = await api.put<Skill>(`/skill/${id}`, { name });
  return data;
}

export async function deleteSkill(id: string): Promise<void> {
  await api.delete(`/skill/${id}`);
}

// Associa uma skill do catálogo ao usuário com nível. O user_id vai no body (a UI
// sempre envia o da sessão — o backend não valida o requester; sugestão registrada).
export async function assignSkillToUser(
  skillId: string,
  userId: string,
  level: SkillLevel,
): Promise<SkillUser> {
  const { data } = await api.post<SkillUser>(`/skill/${skillId}/users`, {
    user_id: userId,
    level,
  });
  return data;
}
