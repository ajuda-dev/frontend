import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import type { AuthUser } from "../../types/api";
import { VerifyEmailPage } from "./VerifyEmailPage";

vi.mock("../../services/auth", () => ({
  login: vi.fn(),
  register: vi.fn(),
  me: vi.fn(),
  logout: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
}));

import { me, resendVerification, verifyEmail } from "../../services/auth";

const mockedMe = vi.mocked(me);
const mockedVerify = vi.mocked(verifyEmail);
const mockedResend = vi.mocked(resendVerification);

const unverified: AuthUser = {
  id: "u1",
  name: "Lucas Rocha",
  email: "lucas@ajudadev.dev",
  role: "USER",
  emailVerified: false,
};

const verified: AuthUser = { ...unverified, emailVerified: true };

function seedSession(user: AuthUser) {
  localStorage.setItem("ajudadev.user", JSON.stringify(user));
}

function renderVerify() {
  return render(
    <MemoryRouter initialEntries={["/confirmar-email"]}>
      <AuthProvider>
        <Routes>
          <Route path="/confirmar-email" element={<VerifyEmailPage />} />
          <Route path="/" element={<p>Home</p>} />
          <Route path="/login" element={<p>Entrar</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("já verificado redireciona para a home", async () => {
    seedSession(verified);
    mockedMe.mockResolvedValue(verified);
    renderVerify();

    expect(await screen.findByText("Home")).toBeInTheDocument();
  });

  it("código vazio é barrado localmente", async () => {
    seedSession(unverified);
    mockedMe.mockResolvedValue(unverified);
    const user = userEvent.setup();
    renderVerify();

    await user.click(await screen.findByRole("button", { name: "Confirmar e-mail" }));

    expect(await screen.findByText("Informe o código")).toBeInTheDocument();
    expect(mockedVerify).not.toHaveBeenCalled();
  });

  it("401 mostra código inválido sem limpar a sessão", async () => {
    seedSession(unverified);
    mockedMe.mockResolvedValue(unverified);
    mockedVerify.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 401",
      response: { status: 401, data: { message: "invalid or expired code", code: 401 } },
    });
    const user = userEvent.setup();
    renderVerify();

    await user.type(await screen.findByLabelText("Código"), "AB12CD");
    await user.click(screen.getByRole("button", { name: "Confirmar e-mail" }));

    expect(await screen.findByText("Código inválido ou expirado")).toBeInTheDocument();
    expect(localStorage.getItem("ajudadev.user")).not.toBeNull();
    expect(screen.queryByText("Entrar")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("ajudadev.user") ?? "{}").emailVerified).toBe(false);
  });

  it("429 mostra a mensagem de tentativas em pt-BR", async () => {
    seedSession(unverified);
    mockedMe.mockResolvedValue(unverified);
    mockedVerify.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 429",
      response: {
        status: 429,
        data: { message: "too many verification attempts", code: 429 },
      },
    });
    const user = userEvent.setup();
    renderVerify();

    await user.type(await screen.findByLabelText("Código"), "AB12CD");
    await user.click(screen.getByRole("button", { name: "Confirmar e-mail" }));

    expect(
      await screen.findByText("Muitas tentativas de confirmação. Aguarde e tente de novo"),
    ).toBeInTheDocument();
  });

  it("sucesso atualiza a sessão e vai para a home", async () => {
    seedSession(unverified);
    mockedMe.mockResolvedValue(unverified);
    mockedVerify.mockResolvedValue(verified);
    const user = userEvent.setup();
    renderVerify();

    await user.type(await screen.findByLabelText("Código"), "ab12cd");
    await user.click(screen.getByRole("button", { name: "Confirmar e-mail" }));

    expect(mockedVerify).toHaveBeenCalledWith("AB12CD");
    expect(await screen.findByText("Home")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("ajudadev.user") ?? "{}").emailVerified).toBe(true);
  });

  it("reenviar mostra aviso de sucesso e traduz o 429", async () => {
    seedSession(unverified);
    mockedMe.mockResolvedValue(unverified);
    mockedResend.mockResolvedValueOnce(undefined).mockRejectedValueOnce({
      isAxiosError: true,
      message: "Request failed with status code 429",
      response: {
        status: 429,
        data: { message: "too many verification emails", code: 429 },
      },
    });
    const user = userEvent.setup();
    renderVerify();

    await user.click(await screen.findByRole("button", { name: "Reenviar código" }));
    expect(await screen.findByText("Enviamos um novo código")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reenviar código" }));
    expect(
      await screen.findByText("Muitos reenvios. Aguarde um pouco antes de pedir outro código"),
    ).toBeInTheDocument();
  });
});
