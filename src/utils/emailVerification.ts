import type { AuthUser } from "../types/api";

export const EMAIL_VERIFICATION_REQUIRED_MESSAGE = "Confirme seu e-mail para continuar";

export function isEmailVerified(user: Pick<AuthUser, "emailVerified"> | null | undefined): boolean {
  return Boolean(user?.emailVerified);
}
