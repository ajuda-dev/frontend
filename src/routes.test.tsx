import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { AuthProvider } from "./context/AuthContext";
import { AppRoutes } from "./routes";

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
  localStorage.setItem("ajudadev.token", "token-123");
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" }),
  );
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
    expect(screen.getByText("<AJUDA.DEV/>")).toBeInTheDocument();
  });

  it("rota inexistente logado mostra o 404 dentro do shell", () => {
    seedSession();
    renderAt("/rota-inexistente");
    expect(screen.getByText("Página não encontrada.")).toBeInTheDocument();
    expect(screen.getByText("<AJUDA.DEV/>")).toBeInTheDocument();
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
});
