import type { BadgeTone } from "../components/ui/Badge";
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

export const EVENT_CATEGORY_COLOR: Record<EventCategory, BadgeTone> = {
  COMMUNITY_EVENT: "info",
  MENTORING: "brand",
  WEBINAR: "ink-muted",
};

export const PARTICIPATION_STATUS_COLOR: Record<ParticipationStatus, BadgeTone> = {
  CONFIRMED: "brand",
  REQUESTED: "warning",
  REJECTED: "danger",
  CANCELLED: "danger",
};

export const PARTICIPATION_ROLE_COLOR: Record<ParticipationRole, BadgeTone> = {
  MENTOR: "brand",
  MENTEE: "brand",
  HOST: "warning",
  SPEAKER: "info",
  ATTENDEE: "ink-muted",
};

export const SKILL_LEVEL_COLOR: Record<SkillLevel, BadgeTone> = {
  WANT_TO_LEARN: "ink-muted",
  LEARN_AND_TEACH: "info",
  TEACH: "brand",
};

export const USER_ROLE_COLOR: Record<UserRole, BadgeTone> = {
  USER: "ink-muted",
  MODERATOR: "warning",
  ADMIN: "danger",
};

export const LABEL_COLORS = {
  category: EVENT_CATEGORY_COLOR,
  status: PARTICIPATION_STATUS_COLOR,
  role: PARTICIPATION_ROLE_COLOR,
  level: SKILL_LEVEL_COLOR,
  userRole: USER_ROLE_COLOR,
} as const;
