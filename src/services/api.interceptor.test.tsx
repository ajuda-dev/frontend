import { AxiosHeaders } from "axios";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AuthProvider } from "../context/AuthContext";
import { LoginPage } from "../pages/auth/LoginPage";
import { api } from "./api";

vi.mock("../services/auth", () => ({
  login: vi.fn(),
  register: vi.fn(),
}));

function seedSession() {
  localStorage.setItem("ajudadev.token", "token-123");
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
    expect(localStorage.getItem("ajudadev.token")).toBeNull();
  });

  it("401 no login não dispara logout", async () => {
    seedSession();
    renderApp();

    const handler = api.interceptors.response as unknown as {
      handlers: { rejected: (error: unknown) => Promise<unknown> }[];
    };
    await expect(handler.handlers[0].rejected(unauthorizedError("/user/login"))).rejects.toBeTruthy();

    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
    expect(localStorage.getItem("ajudadev.token")).toBe("token-123");
  });
});

describe("interceptor de request", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  function runRequestInterceptor(headers: AxiosHeaders) {
    const handler = api.interceptors.request as unknown as {
      handlers: { fulfilled: (config: { headers: AxiosHeaders }) => { headers: AxiosHeaders } }[];
    };
    return handler.handlers[0].fulfilled({ headers });
  }

  it("envia Authorization: Bearer quando há sessão", () => {
    seedSession();
    renderApp();

    const config = runRequestInterceptor(new AxiosHeaders());

    expect(config.headers.get("Authorization")).toBe("Bearer token-123");
  });

  it("não envia Authorization sem sessão", () => {
    renderApp();

    const config = runRequestInterceptor(new AxiosHeaders());

    expect(config.headers.get("Authorization")).toBeUndefined();
  });
});
