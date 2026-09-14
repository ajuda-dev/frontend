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
// (credencial errada no login, /me sem sessão no boot, logout sem cookie válido).
const PUBLIC_AUTH_PATHS = ["/user/login", "/user/register", "/user/me", "/user/logout"];

function isPublicAuthRequest(url: string | undefined): boolean {
  if (!url) return false;
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
}

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !isPublicAuthRequest(error.config?.url)
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
