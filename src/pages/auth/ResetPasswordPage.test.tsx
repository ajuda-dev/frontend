import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordPage } from "./ResetPasswordPage";

vi.mock("../../services/auth", () => ({
  resetPassword: vi.fn(),
}));

import { resetPassword } from "../../services/auth";

const mockedReset = vi.mocked(resetPassword);

function seedSession() {
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" }),
  );
}

function renderReset(entry: string | { pathname: string; state?: { email?: string } } = "/redefinir-senha") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
        <Route path="/login" element={<p>Entrar</p>} />
        <Route path="/esqueci-senha" element={<p>Esqueci a senha</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillReset(
  user: ReturnType<typeof userEvent.setup>,
  fields: { email?: string; code?: string; password?: string } = {},
) {
  if (fields.email) await user.type(screen.getByLabelText("E-mail"), fields.email);
  if (fields.code) await user.type(screen.getByLabelText("Código"), fields.code);
  if (fields.password) await user.type(screen.getByLabelText("Nova senha"), fields.password);
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("senha curta é barrada localmente", async () => {
    const user = userEvent.setup();
    renderReset();

    await fillReset(user, {
      email: "lucas@ajudadev.dev",
      code: "AB12CD",
      password: "123",
    });
    await user.click(screen.getByRole("button", { name: "Redefinir senha" }));

    expect(await screen.findByText("A senha deve ter ao menos 6 caracteres")).toBeInTheDocument();
    expect(mockedReset).not.toHaveBeenCalled();
  });

  it("401 mostra código inválido sem limpar a sessão", async () => {
    seedSession();
    const user = userEvent.setup();
    mockedReset.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 401",
      response: { status: 401, data: { message: "invalid or expired code", code: 401 } },
    });
    renderReset();

    await fillReset(user, {
      email: "lucas@ajudadev.dev",
      code: "AB12CD",
      password: "senha-nova",
    });
    await user.click(screen.getByRole("button", { name: "Redefinir senha" }));

    expect(await screen.findByText("Código inválido ou expirado")).toBeInTheDocument();
    expect(localStorage.getItem("ajudadev.user")).not.toBeNull();
    expect(screen.queryByText("Entrar")).not.toBeInTheDocument();
  });

  it("429 mostra a mensagem de tentativas em pt-BR", async () => {
    const user = userEvent.setup();
    mockedReset.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 429",
      response: {
        status: 429,
        data: { message: "too many password reset attempts", code: 429 },
      },
    });
    renderReset();

    await fillReset(user, {
      email: "lucas@ajudadev.dev",
      code: "AB12CD",
      password: "senha-nova",
    });
    await user.click(screen.getByRole("button", { name: "Redefinir senha" }));

    expect(
      await screen.findByText("Muitas tentativas com este código. Aguarde e solicite um novo"),
    ).toBeInTheDocument();
  });

  it("sucesso envia o código em maiúsculas e vai para o login", async () => {
    const user = userEvent.setup();
    mockedReset.mockResolvedValue(undefined);
    renderReset();

    await fillReset(user, {
      email: "lucas@ajudadev.dev",
      code: "ab12cd",
      password: "senha-nova",
    });
    await user.click(screen.getByRole("button", { name: "Redefinir senha" }));

    expect(mockedReset).toHaveBeenCalledWith({
      email: "lucas@ajudadev.dev",
      code: "AB12CD",
      newPassword: "senha-nova",
    });
    expect(await screen.findByText("Entrar")).toBeInTheDocument();
  });

  it("pré-preenche o e-mail de location.state", () => {
    renderReset({ pathname: "/redefinir-senha", state: { email: "lucas@ajudadev.dev" } });
    expect(screen.getByLabelText("E-mail")).toHaveValue("lucas@ajudadev.dev");
  });
});
