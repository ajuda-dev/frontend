import axios, { AxiosError } from "axios";
import type { ApiErrorBody } from "../types/api";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/v1",
});

export function isApiError(e: unknown): e is AxiosError<ApiErrorBody> {
  return axios.isAxiosError(e);
}

export function apiErrorBody(e: unknown): ApiErrorBody | null {
  return isApiError(e) ? (e.response?.data ?? null) : null;
}
