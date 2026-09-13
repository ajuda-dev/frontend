import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";

vi.mock("../services/user", () => ({
  updateUserName: vi.fn(),
}));

import { updateUserName } from "../services/user";

const mockedUpdate = vi.mocked(updateUserName);

function Probe() {
  const { session, user, updateProfile } = useAuth();
  return (
    <div>
      <p>{session ? `logado:${user?.email}` : "sem sessão"}</p>
      <p>{`nome:${user?.name ?? "-"}`}</p>
      <button
        type="button"
        onClick={() => {
          updateProfile("Lucas R.").catch(() => undefined);
        }}
      >
        editar
      </button>
    </div>
  );
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
    vi.clearAllMocks();
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

  it("updateProfile grava o nome novo e preserva token e id", async () => {
    localStorage.setItem("ajudadev.token", "token-123");
    localStorage.setItem(
      "ajudadev.user",
      JSON.stringify({ id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" }),
    );
    mockedUpdate.mockResolvedValue({
      id: "u1",
      name: "Lucas R.",
      email: "lucas@ajudadev.dev",
      role: "USER",
      token: "",
    });
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: "editar" }));

    expect(mockedUpdate).toHaveBeenCalledWith("u1", "Lucas R.");
    expect(await screen.findByText("nome:Lucas R.")).toBeInTheDocument();
    expect(localStorage.getItem("ajudadev.token")).toBe("token-123");
    expect(JSON.parse(localStorage.getItem("ajudadev.user") ?? "{}")).toEqual({
      id: "u1",
      name: "Lucas R.",
      email: "lucas@ajudadev.dev",
      role: "USER",
    });
  });

  it("updateProfile propaga o erro sem mexer na sessão", async () => {
    localStorage.setItem("ajudadev.token", "token-123");
    localStorage.setItem(
      "ajudadev.user",
      JSON.stringify({ id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" }),
    );
    mockedUpdate.mockRejectedValue(new Error("falhou"));
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: "editar" }));

    expect(screen.getByText("nome:Lucas Rocha")).toBeInTheDocument();
    expect(localStorage.getItem("ajudadev.token")).toBe("token-123");
  });
});
