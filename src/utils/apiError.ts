import { apiErrorBody, isApiError } from "../services/api";
import type { ApiCause, ApiErrorBody } from "../types/api";

export const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  email: "E-mail",
  password: "Senha",
  description: "Descrição",
  title: "Título",
  category: "Categoria",
  type: "Tipo",
  start_at: "Data de início",
  duration_min: "Duração",
  max_slots: "Vagas",
  meeting_link: "Link da reunião",
  community_id: "Comunidade",
  owner_id: "Responsável",
  address_id: "Endereço",
  zip_code: "CEP",
  street: "Logradouro",
  number: "Número",
  complement: "Complemento",
  city: "Cidade",
  state: "Estado",
  user_id: "Usuário",
  skill_id: "Habilidade",
  level: "Nível",
  role: "Papel",
  status: "Status",
};

const MESSAGE_TRANSLATIONS: Record<string, string> = {
  "invalid credentials": "E-mail ou senha inválidos",
  "email already exists": "Este e-mail já está cadastrado",
  "address already exists": "Este endereço já está cadastrado",
  "name is not valid": "Nome inválido",
  "email is not valid": "E-mail inválido",
  "email cannot be empty": "Informe o e-mail",
  "password is not valid": "Senha inválida",
  "password must be at least 6 characters long": "A senha deve ter ao menos 6 caracteres",
  "invalid data": "Dados inválidos",
  "internal server error": "Erro interno no servidor",
  "user not found": "Usuário não encontrado",
  "event not found": "Evento não encontrado",
  "skill not found": "Habilidade não encontrada",
  "address not found": "Endereço não encontrado",
  "only admins can delete users": "Apenas administradores podem excluir usuários",
  "cannot delete user with active associations":
    "Não é possível excluir um usuário com vínculos ativos",
  "cannot delete community with active members":
    "Não é possível excluir uma comunidade com membros ativos",
  "user already joined this community": "Você já participa desta comunidade",
  "user already joined this event": "Você já está inscrito neste evento",
  "user is already a member of this community": "Você já é membro desta comunidade",
  "user is not a member of this community": "Você não é membro desta comunidade",
  "membership not found": "Você não é membro desta comunidade",
  "community not found": "Comunidade não encontrada",
  "community already exists": "Já existe uma comunidade com este nome",
  "unauthorized": "Sessão expirada",
  "forbidden": "Você não tem permissão para esta ação",
  "not found": "Registro não encontrado",
};

export const GENERIC_ERROR_MESSAGE = "Não foi possível concluir a operação. Tente novamente.";

export function translateApiMessage(message: string | undefined): string | null {
  if (!message) return null;
  return MESSAGE_TRANSLATIONS[message.trim().toLowerCase()] ?? null;
}

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

function explainedMessage(error: unknown): string | null {
  const translated = translateApiMessage(apiErrorBody(error)?.message);
  if (translated) return translated;
  if (isApiError(error) && error.response?.status === 401) return "E-mail ou senha inválidos";
  return null;
}

export function apiErrorMessage(error: unknown): string {
  if (!isApiError(error)) return GENERIC_ERROR_MESSAGE;
  return explainedMessage(error) ?? GENERIC_ERROR_MESSAGE;
}

export function apiErrorCauses(error: unknown): ApiCause[] {
  return apiErrorBody(error)?.causes ?? [];
}

export function apiErrorFields(error: unknown): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const cause of apiErrorCauses(error)) {
    fields[cause.field] = translateApiMessage(cause.message) ?? cause.message;
  }
  return fields;
}

export function apiErrorDetail(error: unknown): string | null {
  if (!isApiError(error) || explainedMessage(error)) return null;
  const status = error.response?.status;
  const message = apiErrorBody(error)?.message ?? error.message;
  if (!status && !message) return null;
  return status ? `HTTP ${status} — ${message}` : message;
}

export interface UserMessages {
  summary: string;
  fields: Record<string, string>;
  raw: ApiErrorBody | null;
}

export function toUserMessages(error: unknown): UserMessages {
  const raw = apiErrorBody(error);
  const fields = apiErrorFields(error);
  const summary = apiErrorMessage(error);
  return { summary, fields, raw };
}
