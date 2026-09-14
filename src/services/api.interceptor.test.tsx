import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AuthProvider } from "../context/AuthContext";
import { LoginPage } from "../pages/auth/LoginPage";
import { api } from "./api";
import { me } from "./auth";

vi.mock("./auth", () => ({
  login: vi.fn(),
  register: vi.fn(),
  me: vi.fn(),
  logout: vi.fn(),
  githubLoginUrl: vi.fn(() => "/v1/auth/github/login"),
}));

const mockedMe = vi.mocked(me);
mockedMe.mockResolvedValue({ id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" });

function seedSession() {
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" }),
  );
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<p>Conteúdo protegido</p>} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function unauthorizedError(url: string) {
  return {
    isAxiosError: true,
    message: "Request failed with status code 401",
    config: { url },
    response: { status: 401, data: { message: "unauthorized", code: 401 } },
  };
}

describe("interceptor de 401", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("401 em rota protegida desloga e volta para o login", async () => {
    seedSession();
    renderApp();
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();

    const handler = api.interceptors.response as unknown as {
      handlers: { rejected: (error: unknown) => Promise<unknown> }[];
    };
    await expect(handler.handlers[0].rejected(unauthorizedError("/community"))).rejects.toBeTruthy();

    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    expect(localStorage.getItem("ajudadev.user")).toBeNull();
  });

  it("401 no login não dispara logout", async () => {
    seedSession();
    renderApp();

    const handler = api.interceptors.response as unknown as {
      handlers: { rejected: (error: unknown) => Promise<unknown> }[];
    };
    await expect(handler.handlers[0].rejected(unauthorizedError("/user/login"))).rejects.toBeTruthy();

    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
    expect(localStorage.getItem("ajudadev.user")).not.toBeNull();
  });

  it("401 no /user/me não dispara logout", async () => {
    seedSession();
    renderApp();

    const handler = api.interceptors.response as unknown as {
      handlers: { rejected: (error: unknown) => Promise<unknown> }[];
    };
    await expect(handler.handlers[0].rejected(unauthorizedError("/user/me"))).rejects.toBeTruthy();

    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
    expect(localStorage.getItem("ajudadev.user")).not.toBeNull();
  });
});

describe("sessão por cookie", () => {
  it("envia credenciais em toda requisição (cookie HttpOnly)", () => {
    expect(api.defaults.withCredentials).toBe(true);
  });

  it("não monta header Authorization (o token não passa pelo JS)", () => {
    expect(api.defaults.headers.common["Authorization"]).toBeUndefined();
  });
});
