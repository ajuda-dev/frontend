import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangePasswordForm } from "./ChangePasswordForm";

vi.mock("../../services/auth", () => ({
  changePassword: vi.fn(),
}));

import { changePassword } from "../../services/auth";

const mockedChangePassword = vi.mocked(changePassword);

function apiError(status: number, data: unknown) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data },
  });
}

function renderForm(onSuccess = vi.fn(), onCancel = vi.fn()) {
  return {
    onSuccess,
    onCancel,
    ...render(
      <MemoryRouter>
        <ChangePasswordForm onSuccess={onSuccess} onCancel={onCancel} />
      </MemoryRouter>,
    ),
  };
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  current: string,
  next: string,
) {
  await user.type(screen.getByLabelText("Senha atual"), current);
  await user.type(screen.getByLabelText("Nova senha"), next);
}

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedChangePassword.mockResolvedValue(undefined);
  });

  it("barras vazias e senha curta localmente sem chamar a API", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Salvar senha" }));

    expect(await screen.findByText("Informe a senha atual")).toBeInTheDocument();
    expect(screen.getByText("Informe a nova senha")).toBeInTheDocument();
    expect(mockedChangePassword).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Senha atual"), "antiga123");
    await user.type(screen.getByLabelText("Nova senha"), "123");
    await user.click(screen.getByRole("button", { name: "Salvar senha" }));

    expect(await screen.findByText("A senha deve ter ao menos 6 caracteres")).toBeInTheDocument();
    expect(mockedChangePassword).not.toHaveBeenCalled();
  });

  it("recusa nova senha igual à atual sem chamar a API", async () => {
    const user = userEvent.setup();
    renderForm();

    await fillForm(user, "mesma123", "mesma123");
    await user.click(screen.getByRole("button", { name: "Salvar senha" }));

    expect(await screen.findByText("A nova senha deve ser diferente da atual")).toBeInTheDocument();
    expect(mockedChangePassword).not.toHaveBeenCalled();
  });

  it("envia senha atual e nova e avisa sucesso", async () => {
    const user = userEvent.setup();
    const { onSuccess } = renderForm();

    await fillForm(user, "antiga123", "nova456");
    await user.click(screen.getByRole("button", { name: "Salvar senha" }));

    await waitFor(() => {
      expect(mockedChangePassword).toHaveBeenCalledWith({
        currentPassword: "antiga123",
        newPassword: "nova456",
      });
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("401 invalid credentials marca a senha atual sem fechar o form", async () => {
    mockedChangePassword.mockRejectedValue(
      apiError(401, { message: "invalid credentials", code: 401 }),
    );
    const user = userEvent.setup();
    const { onSuccess } = renderForm();

    await fillForm(user, "errada123", "nova456");
    await user.click(screen.getByRole("button", { name: "Salvar senha" }));

    expect(await screen.findByText("Senha atual incorreta")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha atual")).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("400 com cause newPassword mostra o erro no campo", async () => {
    mockedChangePassword.mockRejectedValue(
      apiError(400, {
        message: "Invalid request",
        code: 400,
        causes: [{ field: "newPassword", message: "Password must be at least 6 characters long" }],
      }),
    );
    const user = userEvent.setup();
    renderForm();

    await fillForm(user, "antiga123", "nova456");
    await user.click(screen.getByRole("button", { name: "Salvar senha" }));

    expect(await screen.findByText("A senha deve ter ao menos 6 caracteres")).toBeInTheDocument();
  });

  it("cancelar chama onCancel sem request", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderForm();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockedChangePassword).not.toHaveBeenCalled();
  });

  it("oferece recuperação por e-mail", () => {
    renderForm();

    expect(screen.getByRole("link", { name: "Recupere por e-mail" })).toHaveAttribute(
      "href",
      "/esqueci-senha",
    );
  });
});
