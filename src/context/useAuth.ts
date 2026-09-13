import { createContext, useContext } from "react";
import type { AuthUser, Session } from "../types/api";

export const TOKEN_KEY = "ajudadev.token";
export const USER_KEY = "ajudadev.user";

export interface AuthContextValue {
  session: Session | null;
  user: Session["user"] | null;
  login: (email: string, password: string) => Promise<Session>;
  register: (name: string, email: string, password: string) => Promise<Session>;
  updateProfile: (name: string) => Promise<AuthUser>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function readStoredSession(): Session | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    if (!token || !rawUser) return null;
    const user = JSON.parse(rawUser) as Session["user"];
    if (!user?.id || !user?.email || !user?.role) return null;
    return { token, user };
  } catch {
    return null;
  }
}

export function persistSession(session: Session): void {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearStoredSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}
