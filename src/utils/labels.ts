import type { BadgeTone } from "../components/ui/Badge";
import {
  isNotificationType,
  type EventApprovalStatus,
  type EventCategory,
  type EventType,
  type EventVisibility,
  type NotificationType,
  type ParticipationRole,
  type ParticipationStatus,
  type SkillLevel,
  type UserRole,
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

export const EVENT_APPROVAL_STATUS_LABEL: Record<EventApprovalStatus, string> = {
  PENDING: "Aguardando aprovação",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

export const EVENT_VISIBILITY_LABEL: Record<EventVisibility, string> = {
  CLOSED: "Fechado",
  PUBLIC: "Público",
};

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  COMMUNITY_EVENT_PENDING_APPROVAL: "Evento para aprovar",
  COMMUNITY_EVENT_APPROVED: "Evento aprovado",
  COMMUNITY_EVENT_REJECTED: "Evento recusado",
  MENTORING_INVITE_PENDING: "Convite de mentoria",
  MENTORING_INVITE_ACCEPTED: "Convite aceito",
  MENTORING_INVITE_REJECTED: "Convite recusado",
  MENTORING_INVITE_RESCHEDULED: "Mentoria reagendada",
  SPEAKER_INVITE_PENDING: "Convite para palestrar",
  SPEAKER_INVITE_ACCEPTED: "Palestrante aceitou",
  SPEAKER_INVITE_REJECTED: "Palestrante recusou",
  SPEAKER_INVITE_RESCHEDULED: "Evento reagendado",
};

export function isInAppNotificationType(type: string): type is NotificationType {
  return isNotificationType(type);
}

export function notificationTypeLabel(type: string): string {
  if (isNotificationType(type)) return NOTIFICATION_TYPE_LABEL[type];
  return "Aviso";
}

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

export const EVENT_APPROVAL_STATUS_COLOR: Record<EventApprovalStatus, BadgeTone> = {
  PENDING: "warning",
  APPROVED: "brand",
  REJECTED: "danger",
};

export const EVENT_VISIBILITY_COLOR: Record<EventVisibility, BadgeTone> = {
  CLOSED: "warning",
  PUBLIC: "brand",
};

export const NOTIFICATION_TYPE_COLOR: Record<NotificationType, BadgeTone> = {
  COMMUNITY_EVENT_PENDING_APPROVAL: "brand",
  COMMUNITY_EVENT_APPROVED: "brand",
  COMMUNITY_EVENT_REJECTED: "danger",
  MENTORING_INVITE_PENDING: "brand",
  MENTORING_INVITE_ACCEPTED: "brand",
  MENTORING_INVITE_REJECTED: "danger",
  MENTORING_INVITE_RESCHEDULED: "warning",
  SPEAKER_INVITE_PENDING: "brand",
  SPEAKER_INVITE_ACCEPTED: "brand",
  SPEAKER_INVITE_REJECTED: "danger",
  SPEAKER_INVITE_RESCHEDULED: "warning",
};

export function notificationTypeTone(type: string): BadgeTone {
  if (isNotificationType(type)) return NOTIFICATION_TYPE_COLOR[type];
  return "ink-muted";
}

export function notificationAccentClass(type: string): string {
  const tone = notificationTypeTone(type);
  if (tone === "warning") return "border-l-2 border-warning";
  if (tone === "danger") return "border-l-2 border-danger";
  return "";
}

export const LABEL_COLORS = {
  category: EVENT_CATEGORY_COLOR,
  status: PARTICIPATION_STATUS_COLOR,
  role: PARTICIPATION_ROLE_COLOR,
  level: SKILL_LEVEL_COLOR,
  userRole: USER_ROLE_COLOR,
  approvalStatus: EVENT_APPROVAL_STATUS_COLOR,
  notification: NOTIFICATION_TYPE_COLOR,
} as const;
