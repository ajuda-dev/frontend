import { apiErrorBody, isApiError } from "../services/api";
import type { ApiCause } from "../types/api";

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
  "name is not valid": "Nome inválido",
  "email is not valid": "E-mail inválido",
  "password is not valid": "Senha inválida",
  "invalid data": "Dados inválidos",
  "internal server error": "Erro interno no servidor",
  "user not found": "Usuário não encontrado",
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
