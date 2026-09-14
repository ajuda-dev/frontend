import type { AuthUser, LoginUserInput, RegisterUserInput } from "../types/api";
import { api } from "./api";

export async function login(email: string, password: string): Promise<AuthUser> {
  const body: LoginUserInput = { email, password };
  const { data } = await api.post<AuthUser>("/user/login", body);
  return data;
}

export async function register(name: string, email: string, password: string): Promise<AuthUser> {
  const body: RegisterUserInput = { name, email, password };
  const { data } = await api.post<AuthUser>("/user/register", body);
  return data;
}

export async function me(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>("/user/me");
  return data;
}

export async function logout(): Promise<void> {
  await api.post("/user/logout");
}

// O login social é uma navegação do navegador (o backend responde 302 para o provedor),
// não uma chamada XHR — a URL sai da mesma base do axios e é usada direto no href.
export function githubLoginUrl(): string {
  return api.getUri({ url: "/auth/github/login" });
}
