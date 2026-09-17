import axios, { AxiosError } from "axios";
import type { ApiErrorBody } from "../types/api";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/v1",
  // Sessão por cookie HttpOnly: o navegador envia o cookie sozinho e o JS nunca lê o token.
  withCredentials: true,
});

let unauthorizedHandler: (() => void) | null = null;

export function onUnauthorized(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

// 401 nestes endpoints não desloga o usuário: são as chamadas de sessão em si
// (credencial errada no login, /me sem sessão no boot, logout sem cookie válido)
// e os fluxos públicos de recuperação de senha (código inválido também é 401).
const PUBLIC_AUTH_PATHS = [
  "/user/login",
  "/user/register",
  "/user/me",
  "/user/logout",
  "/user/forgot-password",
  "/user/reset-password",
];

const INVALID_OR_EXPIRED_CODE = "invalid or expired code";
const INVALID_CREDENTIALS = "invalid credentials";

function isPublicAuthRequest(url: string | undefined): boolean {
  if (!url) return false;
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
}

function isAuthChallenge(error: AxiosError<ApiErrorBody>): boolean {
  const message = error.response?.data?.message;
  if (typeof message !== "string") return false;
  const normalized = message.trim().toLowerCase();
  // Código de reset/verify errado e senha atual errada no change-password
  // são 401 de desafio, não de sessão expirada.
  return normalized === INVALID_OR_EXPIRED_CODE || normalized === INVALID_CREDENTIALS;
}

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !isPublicAuthRequest(error.config?.url) &&
      !isAuthChallenge(error)
    ) {
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);

export function isApiError(e: unknown): e is AxiosError<ApiErrorBody> {
  return axios.isAxiosError(e);
}

export function apiErrorBody(e: unknown): ApiErrorBody | null {
  return isApiError(e) ? (e.response?.data ?? null) : null;
}
