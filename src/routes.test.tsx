import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./context/AuthContext";
import { AppRoutes } from "./routes";

vi.mock("./services/notification", () => ({
  listNotifications: vi.fn().mockResolvedValue({ data: [], has_next: false }),
  markNotificationRead: vi.fn(),
}));

vi.mock("./services/notificationStream", () => ({
  openNotificationStream: vi.fn(() => vi.fn()),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );
}

function seedSession() {
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" }),
  );
  localStorage.setItem("ajudadev.onboarding.u1", JSON.stringify({ seen: true }));
}

describe("AppRoutes", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("sem sessão a home redireciona para o login", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
  });

  it("com sessão a home redireciona para as comunidades", () => {
    seedSession();
    renderAt("/");
    expect(screen.getByRole("heading", { name: "Comunidades" })).toBeInTheDocument();
    expect(screen.getByText("<AJUDA-DEV/>")).toBeInTheDocument();
  });

  it("rota inexistente logado mostra o 404 dentro do shell", () => {
    seedSession();
    renderAt("/rota-inexistente");
    expect(screen.getByText("Página não encontrada.")).toBeInTheDocument();
    expect(screen.getByText("<AJUDA-DEV/>")).toBeInTheDocument();
  });

  it("rota inexistente sem sessão vai para o login", () => {
    renderAt("/rota-inexistente");
    expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.queryByText("Página não encontrada.")).not.toBeInTheDocument();
  });

  it("registro é acessível sem sessão", () => {
    renderAt("/registro");
    expect(screen.getByRole("heading", { name: "Criar conta" })).toBeInTheDocument();
  });

  it("com sessão o login redireciona para as comunidades", () => {
    seedSession();
    renderAt("/login");
    expect(screen.getByRole("heading", { name: "Comunidades" })).toBeInTheDocument();
  });

  it("recuperação de senha é acessível sem sessão", () => {
    renderAt("/esqueci-senha");
    expect(screen.getByRole("heading", { name: "Esqueci a senha" })).toBeInTheDocument();
  });

  it("redefinir senha é acessível sem sessão", () => {
    renderAt("/redefinir-senha");
    expect(screen.getByRole("heading", { name: "Redefinir senha" })).toBeInTheDocument();
  });

  it("com sessão a recuperação de senha continua acessível", () => {
    seedSession();
    renderAt("/esqueci-senha");
    expect(screen.getByRole("heading", { name: "Esqueci a senha" })).toBeInTheDocument();
  });

  it("sem sessão confirmar e-mail redireciona para o login", () => {
    renderAt("/confirmar-email");
    expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
  });

  it("com e-mail pendente a rota de confirmação renderiza a página", () => {
    localStorage.setItem(
      "ajudadev.user",
      JSON.stringify({
        id: "u1",
        name: "Lucas Rocha",
        email: "lucas@ajudadev.dev",
        role: "USER",
        emailVerified: false,
      }),
    );
    renderAt("/confirmar-email");
    expect(screen.getByRole("heading", { name: "Confirmar e-mail" })).toBeInTheDocument();
  });

  it("com e-mail verificado a confirmação redireciona para as comunidades", () => {
    seedSession();
    renderAt("/confirmar-email");
    expect(screen.getByRole("heading", { name: "Comunidades" })).toBeInTheDocument();
  });

  it("a rota /eventos renderiza a página de eventos", () => {
    seedSession();
    renderAt("/eventos");
    expect(screen.getByRole("heading", { name: "Eventos" })).toBeInTheDocument();
  });

  it("a rota /agenda renderiza a página de agenda", () => {
    seedSession();
    renderAt("/agenda");
    expect(screen.getByRole("heading", { name: "Agenda" })).toBeInTheDocument();
  });

  it("a rota /skills não existe mais e cai no 404", () => {
    seedSession();
    renderAt("/skills");
    expect(screen.getByText("Página não encontrada.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Skills" })).not.toBeInTheDocument();
  });
});
