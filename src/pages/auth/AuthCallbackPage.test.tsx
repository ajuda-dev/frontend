import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import { AuthCallbackPage } from "./AuthCallbackPage";

vi.mock("../../services/auth", () => ({
  login: vi.fn(),
  register: vi.fn(),
  me: vi.fn(),
  logout: vi.fn(),
}));

import { me } from "../../services/auth";

const mockedMe = vi.mocked(me);

function renderCallback(entry = "/auth/callback") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/" element={<p>Home</p>} />
          <Route path="/login" element={<p>Login</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("AuthCallbackPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("com cookie válido confirma a sessão e vai para a home", async () => {
    mockedMe.mockResolvedValue({
      id: "u1",
      name: "Lucas Rocha",
      email: "lucas@ajudadev.dev",
      role: "USER",
      emailVerified: true,
    });
    renderCallback();

    expect(await screen.findByText("Home")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("ajudadev.user") ?? "{}").id).toBe("u1");
  });

  it("sem cookie (sessão recusada) volta para o login", async () => {
    mockedMe.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 401",
      config: { url: "/user/me" },
      response: { status: 401, data: { message: "unauthorized", code: 401 } },
    });
    renderCallback();

    expect(await screen.findByText("Login")).toBeInTheDocument();
    expect(localStorage.getItem("ajudadev.user")).toBeNull();
  });

  it("?error=auth_failed mostra o erro sem tentar a sessão", async () => {
    renderCallback("/auth/callback?error=auth_failed");

    expect(
      await screen.findByText("Não foi possível concluir o login com o provedor."),
    ).toBeInTheDocument();
    expect(mockedMe).not.toHaveBeenCalled();
  });
});
