import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import { RegisterPage } from "./RegisterPage";

vi.mock("../../services/auth", () => ({
  login: vi.fn(),
  register: vi.fn(),
}));

import * as authService from "../../services/auth";

const mockedRegister = vi.mocked(authService.register);

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={["/registro"]}>
      <AuthProvider>
        <Routes>
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/" element={<p>Home protegida</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function fillForm(name: string, email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Nome"), name);
  await user.type(screen.getByLabelText("E-mail"), email);
  await user.type(screen.getByLabelText("Senha"), password);
  await user.click(screen.getByRole("button", { name: "Criar conta" }));
  return user;
}

describe("RegisterPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("senha curta é barrada localmente", async () => {
    renderRegister();

    await fillForm("Lucas Rocha", "lucas@ajudadev.dev", "123");

    expect(await screen.findByText("A senha deve ter ao menos 6 caracteres")).toBeInTheDocument();
    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it("nome com caracteres inválidos é barrado localmente", async () => {
    renderRegister();

    await fillForm("Lucas123", "lucas@ajudadev.dev", "senha-secreta");

    expect(await screen.findByText("Nome inválido")).toBeInTheDocument();
    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it("e-mail duplicado mostra mensagem em pt-BR", async () => {
    mockedRegister.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 400",
      response: {
        status: 400,
        data: {
          message: "Invalid data",
          code: 400,
          causes: [{ field: "email", message: "Email already exists" }],
        },
      },
    });
    renderRegister();

    await fillForm("Lucas Rocha", "lucas@ajudadev.dev", "senha-secreta");

    expect(await screen.findByText("Este e-mail já está cadastrado")).toBeInTheDocument();
  });

  it("sucesso grava a sessão (auto-login) e redireciona", async () => {
    mockedRegister.mockResolvedValue({
      token: "token-abc",
      user: { id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" },
    });
    renderRegister();

    await fillForm("Lucas Rocha", "lucas@ajudadev.dev", "senha-secreta");

    expect(await screen.findByText("Home protegida")).toBeInTheDocument();
    expect(localStorage.getItem("ajudadev.token")).toBe("token-abc");
    expect(mockedRegister).toHaveBeenCalledWith("Lucas Rocha", "lucas@ajudadev.dev", "senha-secreta");
  });
});
