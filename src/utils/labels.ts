import type {
  EventCategory,
  EventType,
  ParticipationRole,
  ParticipationStatus,
  SkillLevel,
  UserRole,
} from "../types/api";

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  USER: "Usuário",
  MODERATOR: "Moderador",
  ADMIN: "Administrador",
};

export const EVENT_CATEGORY_LABEL: Record<EventCategory, string> = {
  COMMUNITY_EVENT: "Evento da comunidade",
  MENTORING: "Mentoria 1:1",
  WEBINAR: "Webinar",
};

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  ONLINE: "Online",
  INPERSON: "Presencial",
  HYBRID: "Híbrido",
};

export const PARTICIPATION_ROLE_LABEL: Record<ParticipationRole, string> = {
  HOST: "Anfitrião",
  MENTOR: "Mentor",
  MENTEE: "Mentorado",
  SPEAKER: "Palestrante",
  ATTENDEE: "Participante",
};

export const PARTICIPATION_STATUS_LABEL: Record<ParticipationStatus, string> = {
  REQUESTED: "Pendente",
  CONFIRMED: "Confirmado",
  REJECTED: "Recusado",
  CANCELLED: "Cancelado",
};

export const SKILL_LEVEL_LABEL: Record<SkillLevel, string> = {
  WANT_TO_LEARN: "Quero aprender",
  LEARN_AND_TEACH: "Aprender e ensinar",
  TEACH: "Ensinar",
};
