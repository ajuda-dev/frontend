import type {
  AuthUser,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginUserInput,
  RegisterUserInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "../types/api";
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

export async function forgotPassword(email: string): Promise<void> {
  const body: ForgotPasswordInput = { email };
  await api.post("/user/forgot-password", body);
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const body: ResetPasswordInput = {
    email: input.email,
    code: input.code.trim().toUpperCase(),
    newPassword: input.newPassword,
  };
  await api.post("/user/reset-password", body);
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  const body: ChangePasswordInput = {
    currentPassword: input.currentPassword,
    newPassword: input.newPassword,
  };
  await api.post("/user/change-password", body);
}

export async function verifyEmail(code: string): Promise<AuthUser> {
  const body: VerifyEmailInput = { code: code.trim().toUpperCase() };
  const { data } = await api.post<AuthUser>("/user/verify-email", body);
  return data;
}

export async function resendVerification(): Promise<void> {
  await api.post("/user/resend-verification");
}

// O login social é uma navegação do navegador (o backend responde 302 para o provedor),
// não uma chamada XHR — a URL sai da mesma base do axios e é usada direto no href.
export function githubLoginUrl(): string {
  return api.getUri({ url: "/auth/github/login" });
}
