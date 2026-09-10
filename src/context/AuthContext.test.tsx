import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";

function Probe() {
  const { session, user } = useAuth();
  return <p>{session ? `logado:${user?.email}` : "sem sessão"}</p>;
}

function renderProbe() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Probe />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("inicia sem sessão quando o storage está vazio", () => {
    renderProbe();
    expect(screen.getByText("sem sessão")).toBeInTheDocument();
  });

  it("restaura a sessão persistida", () => {
    localStorage.setItem("ajudadev.token", "token-123");
    localStorage.setItem(
      "ajudadev.user",
      JSON.stringify({ id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" }),
    );
    renderProbe();
    expect(screen.getByText("logado:lucas@ajudadev.dev")).toBeInTheDocument();
  });

  it("storage corrompido não quebra o app", () => {
    localStorage.setItem("ajudadev.token", "token-123");
    localStorage.setItem("ajudadev.user", "{isso não é json");
    renderProbe();
    expect(screen.getByText("sem sessão")).toBeInTheDocument();
  });

  it("token sem usuário é tratado como sem sessão", () => {
    localStorage.setItem("ajudadev.token", "token-123");
    renderProbe();
    expect(screen.getByText("sem sessão")).toBeInTheDocument();
  });
});
