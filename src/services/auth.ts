import type { LoginUserInput, RegisterUserInput, Session, UserSummary } from "../types/api";
import { api } from "./api";

function toSession(user: UserSummary): Session {
  return {
    token: user.token ?? "",
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function login(email: string, password: string): Promise<Session> {
  const body: LoginUserInput = { email, password };
  const { data } = await api.post<UserSummary>("/user/login", body);
  return toSession(data);
}

export async function register(name: string, email: string, password: string): Promise<Session> {
  const body: RegisterUserInput = { name, email, password };
  const { data } = await api.post<UserSummary>("/user/register", body);
  return toSession(data);
}
