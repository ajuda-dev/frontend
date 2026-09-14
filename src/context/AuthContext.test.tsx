import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";

vi.mock("../services/user", () => ({
  updateUserName: vi.fn(),
}));

vi.mock("../services/auth", () => ({
  login: vi.fn(),
  register: vi.fn(),
  me: vi.fn(),
  logout: vi.fn(),
}));

import { me } from "../services/auth";
import { updateUserName } from "../services/user";
import type { AuthUser } from "../types/api";

const mockedUpdate = vi.mocked(updateUserName);
const mockedMe = vi.mocked(me);

const storedUser: AuthUser = {
  id: "u1",
  name: "Lucas Rocha",
  email: "lucas@ajudadev.dev",
  role: "USER",
};

function Probe() {
  const { user, updateProfile } = useAuth();
  return (
    <div>
      <p>{user ? `logado:${user.email}` : "sem sessão"}</p>
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

  it("remove a chave legada ajudadev.token no boot", () => {
    localStorage.setItem("ajudadev.token", "token-antigo");
    renderProbe();
    expect(localStorage.getItem("ajudadev.token")).toBeNull();
  });

  it("restaura a sessão persistida e confirma no /me", async () => {
    localStorage.setItem("ajudadev.user", JSON.stringify(storedUser));
    mockedMe.mockResolvedValue(storedUser);
    renderProbe();

    expect(await screen.findByText("logado:lucas@ajudadev.dev")).toBeInTheDocument();
    expect(mockedMe).toHaveBeenCalledTimes(1);
  });

  it("storage corrompido não quebra o app", () => {
    localStorage.setItem("ajudadev.user", "{isso não é json");
    renderProbe();
    expect(screen.getByText("sem sessão")).toBeInTheDocument();
    expect(mockedMe).not.toHaveBeenCalled();
  });

  it("sessão recusada pelo /me é limpa no boot", async () => {
    localStorage.setItem("ajudadev.user", JSON.stringify(storedUser));
    mockedMe.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 401",
      config: { url: "/user/me" },
      response: { status: 401, data: { message: "unauthorized", code: 401 } },
    });
    renderProbe();

    expect(await screen.findByText("sem sessão")).toBeInTheDocument();
    expect(localStorage.getItem("ajudadev.user")).toBeNull();
  });

  it("updateProfile grava o nome novo e preserva id/email/role", async () => {
    localStorage.setItem("ajudadev.user", JSON.stringify(storedUser));
    mockedMe.mockResolvedValue(storedUser);
    mockedUpdate.mockResolvedValue({
      id: "u1",
      name: "Lucas R.",
      email: "lucas@ajudadev.dev",
      role: "USER",
    });
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: "editar" }));

    expect(mockedUpdate).toHaveBeenCalledWith("u1", "Lucas R.");
    expect(await screen.findByText("nome:Lucas R.")).toBeInTheDocument();
    expect(localStorage.getItem("ajudadev.token")).toBeNull();
    expect(JSON.parse(localStorage.getItem("ajudadev.user") ?? "{}")).toEqual({
      id: "u1",
      name: "Lucas R.",
      email: "lucas@ajudadev.dev",
      role: "USER",
    });
  });

  it("updateProfile propaga o erro sem mexer na sessão", async () => {
    localStorage.setItem("ajudadev.user", JSON.stringify(storedUser));
    mockedMe.mockResolvedValue(storedUser);
    mockedUpdate.mockRejectedValue(new Error("falhou"));
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: "editar" }));

    expect(screen.getByText("nome:Lucas Rocha")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("ajudadev.user") ?? "{}").name).toBe("Lucas Rocha");
  });
});
