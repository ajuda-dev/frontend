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

  it("com sessão a home mostra o wordmark", () => {
    seedSession();
    renderAt("/");
    expect(screen.getByRole("heading", { name: "<AJUDA.DEV/>" })).toBeInTheDocument();
    expect(screen.getByText("Comunidades, eventos e mentoria — em breve.")).toBeInTheDocument();
  });

  it("rota inexistente mostra página não encontrada", () => {
    renderAt("/rota-inexistente");
    expect(screen.getByText("Página não encontrada.")).toBeInTheDocument();
  });

  it("registro é acessível sem sessão", () => {
    renderAt("/registro");
    expect(screen.getByRole("heading", { name: "Criar conta" })).toBeInTheDocument();
  });

  it("com sessão o login redireciona para a home", () => {
    seedSession();
    renderAt("/login");
    expect(screen.getByRole("heading", { name: "<AJUDA.DEV/>" })).toBeInTheDocument();
  });
});
