import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { onUnauthorized, setTokenGetter } from "../services/api";
import * as authService from "../services/auth";
import type { Session } from "../types/api";
import {
  AuthContext,
  clearStoredSession,
  persistSession,
  readStoredSession,
  TOKEN_KEY,
} from "./useAuth";
import type { AuthContextValue } from "./useAuth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readStoredSession);

  const logout = useCallback(() => {
    clearStoredSession();
    setSession(null);
  }, []);

  useEffect(() => {
    setTokenGetter(() => localStorage.getItem(TOKEN_KEY));
    onUnauthorized(logout);
    return () => onUnauthorized(null);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const next = await authService.login(email, password);
    persistSession(next);
    setSession(next);
    return next;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const next = await authService.register(name, email, password);
    persistSession(next);
    setSession(next);
    return next;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, login, register, logout }),
    [session, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
