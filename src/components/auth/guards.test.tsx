import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import { GuestRoute } from "./GuestRoute";
import { ProtectedRoute } from "./ProtectedRoute";

function seedSession(emailVerified = true) {
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({
      id: "u1",
      name: "Lucas Rocha",
      email: "lucas@ajudadev.dev",
      role: "USER",
      emailVerified,
    }),
  );
}

function renderGuards(initialEntry: string | { pathname: string; state: unknown }) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<p>Tela de login</p>} />
            <Route path="/registro" element={<p>Tela de registro</p>} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<p>Conteúdo protegido</p>} />
            <Route path="/confirmar-email" element={<p>Confirmar e-mail</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("sem sessão redireciona para o login", () => {
    renderGuards("/");
    expect(screen.getByText("Tela de login")).toBeInTheDocument();
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
  });

  it("com sessão renderiza o conteúdo protegido", () => {
    seedSession();
    renderGuards("/");
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });
});

describe("GuestRoute", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("sem sessão mostra a tela pública", () => {
    renderGuards("/login");
    expect(screen.getByText("Tela de login")).toBeInTheDocument();
  });

  it("com sessão redireciona para a home", () => {
    seedSession();
    renderGuards("/login");
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
    expect(screen.queryByText("Tela de login")).not.toBeInTheDocument();
  });

  it("com e-mail pendente o registro redireciona para a confirmação", () => {
    seedSession(false);
    renderGuards("/registro");
    expect(screen.getByText("Confirmar e-mail")).toBeInTheDocument();
    expect(screen.queryByText("Tela de registro")).not.toBeInTheDocument();
  });

  it("com e-mail pendente o login continua indo para a home", () => {
    seedSession(false);
    renderGuards("/login");
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
    expect(screen.queryByText("Confirmar e-mail")).not.toBeInTheDocument();
  });
});
