import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { isApiError, onUnauthorized } from "../services/api";
import * as authService from "../services/auth";
import { updateUserName } from "../services/user";
import type { AuthUser } from "../types/api";
import { AuthContext, clearStoredUser, persistUser, purgeLegacyToken, readStoredUser } from "./useAuth";
import type { AuthContextValue } from "./useAuth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);

  const clearSession = useCallback(() => {
    clearStoredUser();
    setUser(null);
  }, []);

  // O token vive no cookie HttpOnly: o /me é quem confirma (e atualiza) a sessão em uso.
  const refreshSession = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const current = await authService.me();
      persistUser(current);
      setUser(current);
      return current;
    } catch (error) {
      if (isApiError(error) && error.response?.status === 401) {
        clearSession();
      }
      return null;
    }
  }, [clearSession]);

  const logout = useCallback(() => {
    void authService.logout().catch(() => undefined);
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    onUnauthorized(clearSession);
    return () => onUnauthorized(null);
  }, [clearSession]);

  useEffect(() => {
    purgeLegacyToken();
    if (!readStoredUser()) return;
    let active = true;
    authService
      .me()
      .then((current) => {
        // Se a sessão foi encerrada (logout ou 401) enquanto o /me corria, não ressuscita o usuário.
        if (!active || !readStoredUser()) return;
        persistUser(current);
        setUser(current);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (isApiError(error) && error.response?.status === 401) clearSession();
      });
    return () => {
      active = false;
    };
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const current = await authService.login(email, password);
    persistUser(current);
    setUser(current);
    return current;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const current = await authService.register(name, email, password);
    persistUser(current);
    setUser(current);
    return current;
  }, []);

  const updateProfile = useCallback(
    async (name: string): Promise<AuthUser> => {
      if (!user) throw new Error("Sem sessão para atualizar o perfil");
      const updated = await updateUserName(user.id, name);
      const current: AuthUser = {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        emailVerified: user.emailVerified,
      };
      persistUser(current);
      setUser(current);
      return current;
    },
    [user],
  );

  const verifyEmail = useCallback(async (code: string) => {
    const current = await authService.verifyEmail(code);
    persistUser(current);
    setUser(current);
    return current;
  }, []);

  const resendVerification = useCallback(async () => {
    await authService.resendVerification();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      refreshSession,
      login,
      register,
      updateProfile,
      verifyEmail,
      resendVerification,
      logout,
    }),
    [user, refreshSession, login, register, updateProfile, verifyEmail, resendVerification, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
