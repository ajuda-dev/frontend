export interface Address {
  id: string;
  zip_code: string;
  street?: string;
  number?: string;
  complement?: string;
  city: string;
  state: string;
}

export interface VisibilityConfig {
  value: string;
  shareWithCommunity: boolean;
}

export interface ConfigVisibility {
  [key: string]: VisibilityConfig;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token?: string;
  description?: string;
  configVisibility?: ConfigVisibility;
}

export interface UserProfile {
  id: string;
  name: string;
  description: string;
  email?: string;
  configVisibility: ConfigVisibility;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  address?: Address | null;
  owner?: UserSummary | null;
}

export interface CommunityUser {
  id: string;
  community_id: string;
  user_id: string;
}

export interface Pageable<T> {
  data: T[];
  has_next: boolean;
}

export interface Skill {
  id: string;
  name: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  type: EventType;
  start_at: string;
  duration_min: number;
  max_slots?: number | null;
  meeting_link?: string;
  community?: Community | null;
  address?: Address | null;
  owner?: UserSummary | null;
}

export interface EventUser {
  id: string;
  event_id: string;
  user_id: string;
  role: ParticipationRole;
  status: ParticipationStatus;
  user?: UserSummary | null;
}

export interface SkillUser {
  id: string;
  skill_id: string;
  user_id: string;
  level: SkillLevel;
  skill?: Skill | null;
}

export interface UserWithSkills {
  id: string;
  name: string;
  skills: Skill[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Session {
  token: string;
  user: AuthUser;
}

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserInput {
  name?: string;
  description?: string;
  configVisibility?: ConfigVisibility;
}

export interface RegisterAddressInput {
  zip_code: string;
  number: string;
  complement?: string;
}

export interface RegisterCommunityInput {
  id?: string;
  name: string;
  description: string;
  owner_id?: string;
  address_id?: string;
}

export interface RegisterEventInput {
  id?: string;
  category: EventCategory;
  type: EventType;
  title: string;
  description: string;
  start_at: string;
  duration_min: number;
  max_slots?: number | null;
  meeting_link?: string;
  owner_id?: string;
  community_id?: string;
  address_id?: string;
}

export interface RegisterSkillInput {
  id?: string;
  name: string;
}

export interface UpdateSkillInput {
  name: string;
}

export interface AddParticipantInput {
  user_id: string;
  role: ParticipationRole;
}

export interface JoinEventInput {
  user_id: string;
}

export interface UpdateParticipantStatusInput {
  status: ParticipationStatus;
}

export interface AssignSkillInput {
  user_id: string;
  level: SkillLevel;
}

export interface ApiCause {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  message?: string;
  error?: string;
  code?: number;
  causes?: ApiCause[];
}

export const USER_ROLES = ["USER", "MODERATOR", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const EVENT_CATEGORIES = ["COMMUNITY_EVENT", "MENTORING", "WEBINAR"] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_TYPES = ["ONLINE", "INPERSON", "HYBRID"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const PARTICIPATION_ROLES = ["HOST", "MENTOR", "MENTEE", "SPEAKER", "ATTENDEE"] as const;
export type ParticipationRole = (typeof PARTICIPATION_ROLES)[number];

export const PARTICIPATION_STATUSES = ["REQUESTED", "CONFIRMED", "REJECTED", "CANCELLED"] as const;
export type ParticipationStatus = (typeof PARTICIPATION_STATUSES)[number];

export const SKILL_LEVELS = ["WANT_TO_LEARN", "LEARN_AND_TEACH", "TEACH"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];
