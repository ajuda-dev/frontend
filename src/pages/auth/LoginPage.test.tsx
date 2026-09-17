import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import { LoginPage } from "./LoginPage";

vi.mock("../../services/auth", () => ({
  login: vi.fn(),
  register: vi.fn(),
  githubLoginUrl: vi.fn(() => "/v1/auth/github/login"),
}));

import * as authService from "../../services/auth";

const mockedLogin = vi.mocked(authService.login);

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>Home protegida</p>} />
          <Route path="/comunidades" element={<p>Comunidades</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("submit vazio mostra erros locais sem chamar a API", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Informe seu e-mail")).toBeInTheDocument();
    expect(screen.getByText("Informe sua senha")).toBeInTheDocument();
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it("credenciais inválidas mostram mensagem em pt-BR", async () => {
    const user = userEvent.setup();
    mockedLogin.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 401",
      response: { status: 401, data: { message: "invalid credentials", code: 401 } },
    });
    renderLogin();

    await user.type(screen.getByLabelText("E-mail"), "lucas@ajudadev.dev");
    await user.type(screen.getByLabelText("Senha"), "senha-errada");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("E-mail ou senha inválidos")).toBeInTheDocument();
  });

  it("sucesso grava a sessão e redireciona para a home", async () => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValue({
      id: "u1",
      name: "Lucas Rocha",
      email: "lucas@ajudadev.dev",
      role: "USER",
      emailVerified: true,
    });
    renderLogin();

    await user.type(screen.getByLabelText("E-mail"), "lucas@ajudadev.dev");
    await user.type(screen.getByLabelText("Senha"), "senha-secreta");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Home protegida")).toBeInTheDocument();
    expect(localStorage.getItem("ajudadev.token")).toBeNull();
    expect(JSON.parse(localStorage.getItem("ajudadev.user") ?? "{}").email).toBe("lucas@ajudadev.dev");
  });

  it("usuário sem e-mail confirmado entra na home, não na confirmação", async () => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValue({
      id: "u1",
      name: "Lucas Rocha",
      email: "lucas@ajudadev.dev",
      role: "USER",
      emailVerified: false,
    });
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<p>Home protegida</p>} />
            <Route path="/confirmar-email" element={<p>Confirmar e-mail</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("E-mail"), "lucas@ajudadev.dev");
    await user.type(screen.getByLabelText("Senha"), "senha-secreta");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Home protegida")).toBeInTheDocument();
    expect(screen.queryByText("Confirmar e-mail")).not.toBeInTheDocument();
  });

  it("volta para a página de origem informada em state.from", async () => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValue({
      id: "u1",
      name: "Lucas Rocha",
      email: "lucas@ajudadev.dev",
      role: "USER",
      emailVerified: true,
    });
    render(
      <MemoryRouter initialEntries={[{ pathname: "/login", state: { from: "/comunidades" } }]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<p>Home protegida</p>} />
            <Route path="/comunidades" element={<p>Comunidades</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("E-mail"), "lucas@ajudadev.dev");
    await user.type(screen.getByLabelText("Senha"), "senha-secreta");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Comunidades")).toBeInTheDocument();
  });

  it("mostra o botão de entrar com GitHub apontando para o OAuth do backend", () => {
    renderLogin();

    const link = screen.getByRole("link", { name: "Entrar com GitHub" });
    expect(link).toHaveAttribute("href", "/v1/auth/github/login");
  });

  it("mostra o link para recuperar a senha", () => {
    renderLogin();

    expect(screen.getByRole("link", { name: "Esqueci a senha" })).toHaveAttribute(
      "href",
      "/esqueci-senha",
    );
  });
});
