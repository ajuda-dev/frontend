import { createContext, useContext } from "react";
import type { AuthUser } from "../types/api";

export const USER_KEY = "ajudadev.user";
const LEGACY_TOKEN_KEY = "ajudadev.token";

export interface AuthContextValue {
  user: AuthUser | null;
  refreshSession: () => Promise<AuthUser | null>;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  updateProfile: (name: string) => Promise<AuthUser>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// O token vive em cookie HttpOnly; aqui só é guardado o usuário (id/nome/email/role), que não é segredo.
export function readStoredUser(): AuthUser | null {
  try {
    const rawUser = localStorage.getItem(USER_KEY);
    if (!rawUser) return null;
    const user = JSON.parse(rawUser) as AuthUser;
    if (!user?.id || !user?.email || !user?.role) return null;
    return user;
  } catch {
    return null;
  }
}

export function persistUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(USER_KEY);
}

// Limpeza da chave antiga: o token agora vive no cookie HttpOnly, mas navegadores que usaram
// a versão anterior guardam um JWT em `ajudadev.token` — precisa sumir de lá.
export function purgeLegacyToken(): void {
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}
