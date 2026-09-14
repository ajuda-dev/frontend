import { apiErrorBody, isApiError } from "../services/api";
import type { ApiCause, ApiErrorBody } from "../types/api";
import { contactFieldKey, contactLabel } from "./contacts";

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
  creator_role: "Papel de quem cria",
  approval_status: "Situação de aprovação",
  body: "Formulário",
  id: "Identificador",
  members: "Membros",
  address: "Endereço",
  community: "Comunidade",
  event: "Evento",
  skill: "Habilidade",
  event_id: "Evento",
  community_users: "Membros",
  event_users: "Participantes",
  // O backend usa camelCase em alguns causes (validação de uuid no controller).
  userId: "Usuário",
  skillId: "Habilidade",
  eventId: "Evento",
  communityId: "Comunidade",
  addressId: "Endereço",
  ownerId: "Responsável",
  // O ViaCEP devolve este texto como *campo* do cause (deveria ser "address").
  "invalid search address data": "Endereço",
};

const MESSAGE_TRANSLATIONS: Record<string, string> = {
  "invalid credentials": "E-mail ou senha inválidos",
  "email already exists": "Este e-mail já está cadastrado",
  "address already exists": "Este endereço já está cadastrado",
  "name is not valid": "Nome inválido",
  "email is not valid": "E-mail inválido",
  "email cannot be empty": "Informe o e-mail",
  "password cannot be empty": "Informe a senha",
  "password must be at least 6 characters long": "A senha deve ter ao menos 6 caracteres",
  "invalid user data": "Dados do usuário inválidos",
  "invalid community data": "Dados da comunidade inválidos",
  "invalid params": "Parâmetros inválidos",
  "invalid delete": "Não foi possível excluir",
  "invalid search address data": "Não foi possível localizar este CEP",
  "pass at least zipcode or city, state and street to search for an address":
    "Informe o CEP ou o endereço completo para buscar",
  "internal server error": "Erro interno no servidor",
  "user not found": "Usuário não encontrado",
  "event not found": "Evento não encontrado",
  "skill not found": "Habilidade não encontrada",
  "skill already exists": "Já existe uma habilidade com este nome",
  "only moderators and admins can delete skills":
    "Apenas moderadores e administradores podem arquivar habilidades",
  "user already has this skill": "Este usuário já possui esta habilidade",
  "address not found": "Endereço não encontrado",
  "only admins can delete users": "Apenas administradores podem excluir usuários",
  "cannot delete user with active associations":
    "Não é possível excluir um usuário com vínculos ativos",
  "community has associated members; remove them before deleting":
    "Esta comunidade ainda tem membros; remova todos antes de excluir",
  "user is already a member of this community": "Você já é membro desta comunidade",
  "user is not a member of this community": "Você não é membro desta comunidade",
  "membership not found": "Você não é membro desta comunidade",
  "community not found": "Comunidade não encontrada",
  "already has a community with this name": "Já existe uma comunidade com este nome",
  "only the community owner can delete this community":
    "Apenas o responsável, moderadores e administradores podem excluir esta comunidade",
  "only the community owner can update this community":
    "Apenas o responsável, moderadores e administradores podem alterar esta comunidade",
  "only moderators and admins can update skills":
    "Apenas moderadores e administradores podem alterar habilidades",
  "only the user themselves or an admin can update this user":
    "Você só pode alterar os seus próprios dados",
  "provide at least one field to update": "Informe ao menos um campo para alterar",
  "description must have at most 500 characters": "O resumo deve ter no máximo 500 caracteres",
  "value must be a valid http or https url": "Informe um link http(s) válido (ex.: https://exemplo.com)",
  "value must have at most 500 characters": "O link deve ter no máximo 500 caracteres",
  "value must be a valid phone number": "Informe um telefone válido (8 a 15 dígitos)",
  "value must have at most 20 characters": "O telefone deve ter no máximo 20 caracteres",
  "sharewithcommunity requires a value": "Para compartilhar com a comunidade, informe um valor",
  "unsupported visibility key": "Campo de contato não suportado",
  "email value is managed by the system":
    "O e-mail é gerenciado pelo sistema; só a visibilidade pode ser alterada",
  "email and password cannot be changed by this endpoint":
    "E-mail e senha não podem ser alterados por este endpoint",
  "is owner of an active community": "É responsável por uma comunidade ativa",
  "is owner of an active event": "É responsável por um evento ativo",
  "has an active participation in an event": "Tem participação ativa em um evento",
  "is a member of an active community": "É membro de uma comunidade ativa",
  "title is not valid": "Informe um título para o evento",
  "category is not valid": "Categoria inválida",
  "type is not valid": "Formato inválido",
  "startat must be in the future": "A data do evento precisa ser no futuro",
  "durationmin must be greater than zero": "A duração precisa ser maior que zero",
  "addressid is required for inperson events": "Informe o endereço do evento presencial",
  "addressid is required for hybrid events": "Informe o endereço do evento híbrido",
  "addressid must be empty for online events": "Eventos online não devem ter endereço",
  "addressid is not valid": "Endereço inválido",
  "communityid is not valid": "Comunidade inválida",
  "address_id is not valid, not found this address": "Endereço não encontrado",
  "community_id is not valid, not found this community": "Comunidade não encontrada",
  "invalid event data": "Dados do evento inválidos",
  "invalid participation data": "Dados da participação inválidos",
  "event is not approved yet": "Este evento ainda não foi aprovado pela comunidade",
  "only the invited user can accept or reject this invitation":
    "Só quem recebeu o convite pode aceitar ou recusá-lo",
  "the creator cannot leave the event; cancel the event instead":
    "Quem criou o evento não pode sair dele — cancele o evento",
  "only the event owner, the community owner or moderators can manage this event":
    "Apenas quem criou o evento, o responsável pela comunidade (ou moderadores e administradores) pode gerenciá-lo",
  "only the community owner can approve this event":
    "Apenas o responsável pela comunidade (ou moderadores e administradores) pode aprovar este evento",
  "only the community owner can filter events by approval status":
    "Apenas o responsável pela comunidade pode filtrar por situação de aprovação",
  "only community members can create events for this community":
    "Só o responsável ou membros da comunidade podem criar eventos nela",
  "only moderators and admins can read another user's agenda":
    "Apenas moderadores e administradores podem ver a agenda de outra pessoa",
  "creatorrole is only allowed for mentoring events":
    "O papel de quem cria só vale em eventos de mentoria",
  "creatorrole is not valid, use mentor or mentee":
    "Papel de quem cria inválido: use mentor ou mentorado",
  "role is not valid, use mentor or mentee": "Papel inválido para esta mentoria: use mentor ou mentorado",
  "invalid skill data": "Dados da habilidade inválidos",
  "invalid skill user data": "Dados da habilidade do usuário inválidos",
  "description is not valid": "Descrição inválida",
  "skill name is not valid": "Nome da habilidade inválido",
  "level is not valid, use want_to_learn, learn_and_teach or teach": "Nível inválido",
  "role is not valid, use mentee or speaker": "Papel inválido para este evento",
  "status is not valid, use confirmed or rejected": "Status inválido",
  "query param skill is required": "Escolha uma habilidade para buscar",
  "zip_code must contain digits": "O CEP deve conter apenas dígitos",
  "street must have at most 200 characters": "O logradouro deve ter no máximo 200 caracteres",
  "number must have at most 20 characters": "O número deve ter no máximo 20 caracteres",
  "complement must have at most 60 characters": "O complemento deve ter no máximo 60 caracteres",
  "id is not valid": "Identificador inválido",
  "userid is not valid": "Usuário inválido",
  "skillid is not valid": "Habilidade inválida",
  "eventid is not valid": "Evento inválido",
  "ownerid is not valid": "Responsável inválido",
  "id must be a valid uuid v7": "Identificador inválido",
  "userid must be a valid uuid v7": "Identificador de usuário inválido",
  "skillid must be a valid uuid v7": "Identificador de habilidade inválido",
  "eventid must be a valid uuid v7": "Identificador de evento inválido",
  "communityid must be a valid uuid v7": "Identificador de comunidade inválido",
  "owner_id must be a valid uuid v7": "Identificador de responsável inválido",
  "address_id must be a valid uuid v7": "Identificador de endereço inválido",
  "mentee role is only allowed for mentoring events":
    "O papel de mentorado só vale em eventos de mentoria",
  "speaker role is not allowed for mentoring events":
    "O papel de palestrante não vale em eventos de mentoria",
  "mentoring events cannot be joined, the host must invite the mentee":
    "Eventos de mentoria não aceitam inscrição; o mentor convida o mentorado",
  "user_id is not valid, not found this user": "Usuário não encontrado",
  "event is full": "O evento está cheio",
  "user is already invited to this event": "Este usuário já tem convite pendente neste evento",
  "user is already a participant of this event": "Este usuário já participa deste evento",
  "event already has a confirmed mentee": "Esta mentoria já tem um mentorado confirmado",
  "invalid authenticated user": "Sessão inválida",
  "missing authenticated user": "Sessão não identificada",
  "missing or invalid authorization header": "Sessão não identificada",
  "invalid or expired token": "Sessão expirada",
  "unauthorized": "Sessão expirada",
  "forbidden": "Você não tem permissão para esta ação",
  "not found": "Registro não encontrado",
};

export const GENERIC_ERROR_MESSAGE = "Não foi possível concluir a operação. Tente novamente.";

// Mensagem dinâmica do repo de event_users: "invalid status transition from X to Y".
const STATUS_TRANSITION_PREFIX = "invalid status transition from";

// "Role must be complementary to the creator role, use MENTOR|MENTEE" — o papel
// esperado no final varia, então só o prefixo é comparado.
const ROLE_COMPLEMENTARY_PREFIX = "role must be complementary to the creator role";

export function translateApiMessage(message: string | undefined): string | null {
  if (!message) return null;
  const normalized = message.trim().toLowerCase();
  if (normalized.startsWith(STATUS_TRANSITION_PREFIX)) {
    return "Esta ação não é permitida no estado atual da participação";
  }
  if (normalized.startsWith(ROLE_COMPLEMENTARY_PREFIX)) {
    return "O convite precisa ser para o papel complementar ao de quem criou a mentoria";
  }
  return MESSAGE_TRANSLATIONS[normalized] ?? null;
}

export function fieldLabel(field: string): string {
  const contactKey = contactFieldKey(field);
  if (contactKey) return contactLabel(contactKey);
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

// A mesma mensagem pode chegar no corpo ou nos causes, dependendo da camada que
// falhou; centraliza a comparação para os fluxos que reagem a um erro específico
// (habilidade duplicada, associação repetida).
export function hasApiMessage(error: unknown, message: string): boolean {
  const body = apiErrorBody(error);
  const normalized = message.trim().toLowerCase();
  const messages = [body?.message, ...(body?.causes ?? []).map((cause) => cause.message)];
  return messages.some((item) => item?.trim().toLowerCase() === normalized);
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
