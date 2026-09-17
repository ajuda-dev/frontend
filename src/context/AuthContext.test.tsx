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
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
}));

import { me, verifyEmail } from "../services/auth";
import { updateUserName } from "../services/user";
import type { AuthUser } from "../types/api";

const mockedUpdate = vi.mocked(updateUserName);
const mockedMe = vi.mocked(me);
const mockedVerify = vi.mocked(verifyEmail);

const storedUser: AuthUser = {
  id: "u1",
  name: "Lucas Rocha",
  email: "lucas@ajudadev.dev",
  role: "USER",
  emailVerified: true,
};

function Probe() {
  const { user, updateProfile, verifyEmail } = useAuth();
  return (
    <div>
      <p>{user ? `logado:${user.email}` : "sem sessão"}</p>
      <p>{`nome:${user?.name ?? "-"}`}</p>
      <p>{`verificado:${user ? String(user.emailVerified) : "-"}`}</p>
      <button
        type="button"
        onClick={() => {
          updateProfile("Lucas R.").catch(() => undefined);
        }}
      >
        editar
      </button>
      <button
        type="button"
        onClick={() => {
          verifyEmail("AB12CD").catch(() => undefined);
        }}
      >
        confirmar
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

  it("updateProfile grava o nome novo e preserva id/email/role/emailVerified", async () => {
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
      emailVerified: true,
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

  it("me com emailVerified false persiste a flag no storage", async () => {
    const unverified: AuthUser = { ...storedUser, emailVerified: false };
    localStorage.setItem("ajudadev.user", JSON.stringify(unverified));
    mockedMe.mockResolvedValue(unverified);
    renderProbe();

    expect(await screen.findByText("verificado:false")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("ajudadev.user") ?? "{}").emailVerified).toBe(false);
  });

  it("updateProfile não zera emailVerified", async () => {
    const unverified: AuthUser = { ...storedUser, emailVerified: false };
    localStorage.setItem("ajudadev.user", JSON.stringify(unverified));
    mockedMe.mockResolvedValue(unverified);
    mockedUpdate.mockResolvedValue({
      id: "u1",
      name: "Lucas R.",
      email: "lucas@ajudadev.dev",
      role: "USER",
    });
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: "editar" }));

    expect(await screen.findByText("nome:Lucas R.")).toBeInTheDocument();
    expect(await screen.findByText("verificado:false")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("ajudadev.user") ?? "{}").emailVerified).toBe(false);
  });

  it("verifyEmail atualiza a sessão com emailVerified true", async () => {
    const unverified: AuthUser = { ...storedUser, emailVerified: false };
    localStorage.setItem("ajudadev.user", JSON.stringify(unverified));
    mockedMe.mockResolvedValue(unverified);
    mockedVerify.mockResolvedValue({ ...storedUser, emailVerified: true });
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: "confirmar" }));

    expect(mockedVerify).toHaveBeenCalledWith("AB12CD");
    expect(await screen.findByText("verificado:true")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("ajudadev.user") ?? "{}").emailVerified).toBe(true);
  });
});
