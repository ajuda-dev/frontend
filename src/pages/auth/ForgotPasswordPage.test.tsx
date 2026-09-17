import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordPage } from "./ForgotPasswordPage";

vi.mock("../../services/auth", () => ({
  forgotPassword: vi.fn(),
}));

import { forgotPassword } from "../../services/auth";

const mockedForgot = vi.mocked(forgotPassword);

function renderForgot() {
  return render(
    <MemoryRouter initialEntries={["/esqueci-senha"]}>
      <Routes>
        <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
        <Route path="/redefinir-senha" element={<p>Redefinir senha</p>} />
        <Route path="/login" element={<p>Login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submit vazio mostra erro local sem chamar a API", async () => {
    const user = userEvent.setup();
    renderForgot();

    await user.click(screen.getByRole("button", { name: "Enviar código" }));

    expect(await screen.findByText("Informe seu e-mail")).toBeInTheDocument();
    expect(mockedForgot).not.toHaveBeenCalled();
  });

  it("sucesso mostra mensagem genérica e o atalho para redefinir", async () => {
    const user = userEvent.setup();
    mockedForgot.mockResolvedValue(undefined);
    renderForgot();

    await user.type(screen.getByLabelText("E-mail"), "lucas@ajudadev.dev");
    await user.click(screen.getByRole("button", { name: "Enviar código" }));

    expect(
      await screen.findByText("Se existir uma conta com este e-mail, enviamos um código."),
    ).toBeInTheDocument();
    expect(screen.getByText("O código expira em poucos minutos.")).toBeInTheDocument();
    expect(mockedForgot).toHaveBeenCalledWith("lucas@ajudadev.dev");
    expect(screen.getByRole("link", { name: "Já tenho o código" })).toHaveAttribute(
      "href",
      "/redefinir-senha?email=lucas%40ajudadev.dev",
    );
  });

  it("429 mostra a mensagem de rate em pt-BR", async () => {
    const user = userEvent.setup();
    mockedForgot.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 429",
      response: {
        status: 429,
        data: { message: "too many password reset requests", code: 429 },
      },
    });
    renderForgot();

    await user.type(screen.getByLabelText("E-mail"), "lucas@ajudadev.dev");
    await user.click(screen.getByRole("button", { name: "Enviar código" }));

    expect(
      await screen.findByText(
        "Muitas solicitações de recuperação. Aguarde um pouco e tente de novo",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Se existir uma conta com este e-mail, enviamos um código."),
    ).not.toBeInTheDocument();
  });
});
