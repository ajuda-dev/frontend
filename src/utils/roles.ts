import type { UserRole } from "../types/api";

// Espelha roleRank de src/service/authorization.go do backend.
const ROLE_RANK: Record<UserRole, number> = {
  USER: 1,
  MODERATOR: 2,
  ADMIN: 3,
};

export function roleRank(role: UserRole | null | undefined): number {
  if (!role) return 0;
  return ROLE_RANK[role] ?? 0;
}

export function canAtLeast(role: UserRole | null | undefined, minimum: UserRole): boolean {
  return roleRank(role) >= roleRank(minimum);
}
