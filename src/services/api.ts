import axios, { AxiosError } from "axios";
import type { ApiErrorBody } from "../types/api";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/v1",
});

let tokenGetter: () => string | null = () => null;
let unauthorizedHandler: (() => void) | null = null;

export function setTokenGetter(getter: () => string | null): void {
  tokenGetter = getter;
}

export function onUnauthorized(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

const PUBLIC_AUTH_PATHS = ["/user/login", "/user/register"];

function isPublicAuthRequest(url: string | undefined): boolean {
  if (!url) return false;
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
}

api.interceptors.request.use((config) => {
  const token = tokenGetter();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

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
