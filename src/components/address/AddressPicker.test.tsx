import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Address } from "../../types/api";
import { AddressPicker } from "./AddressPicker";

const SAVED: Address = {
  id: "a1",
  zip_code: "01310100",
  street: "Avenida Paulista",
  number: "1000",
  city: "São Paulo",
  state: "SP",
};

const CREATED: Address = {
  id: "a2",
  zip_code: "20040020",
  street: "Rua da Assembleia",
  number: "50",
  complement: "Sala 3",
  city: "Rio de Janeiro",
  state: "RJ",
};

function duplicateError() {
  return {
    isAxiosError: true,
    message: "Request failed with status code 400",
    response: {
      status: 400,
      data: {
        message: "invalid data",
        code: 400,
        causes: [{ field: "address", message: "Address already exists" }],
      },
    },
  };
}

function renderPicker(overrides: Partial<Parameters<typeof AddressPicker>[0]> = {}) {
  const props = {
    addresses: [] as Address[],
    onSave: vi.fn().mockResolvedValue(CREATED),
    findByKey: vi.fn().mockReturnValue(null),
    onAddress: vi.fn(),
    ...overrides,
  };
  render(<AddressPicker {...props} />);
  return props;
}

describe("AddressPicker", () => {
  it("CEP incompleto bloqueia o submit sem chamar a API", async () => {
    const user = userEvent.setup();
    const props = renderPicker();

    await user.type(screen.getByLabelText("CEP"), "0131010");
    await user.type(screen.getByLabelText("Número"), "1000");
    await user.click(screen.getByRole("button", { name: "Buscar endereço" }));

    expect(await screen.findByText("Informe um CEP com 8 dígitos")).toBeInTheDocument();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it("número vazio bloqueia o submit", async () => {
    const user = userEvent.setup();
    const props = renderPicker();

    await user.type(screen.getByLabelText("CEP"), "01310100");
    await user.click(screen.getByRole("button", { name: "Buscar endereço" }));

    expect(await screen.findByText("Informe o número")).toBeInTheDocument();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it("aplica a máscara do CEP e envia só os dígitos", async () => {
    const user = userEvent.setup();
    const props = renderPicker();

    await user.type(screen.getByLabelText("CEP"), "01310100");
    expect(screen.getByLabelText("CEP")).toHaveValue("01310-100");

    await user.type(screen.getByLabelText("Número"), "1000");
    await user.click(screen.getByRole("button", { name: "Buscar endereço" }));

    expect(props.onSave).toHaveBeenCalledWith({
      zip_code: "01310100",
      number: "1000",
      complement: "",
    });
  });

  it("sucesso devolve o endereço completo do backend e mostra o resumo", async () => {
    const user = userEvent.setup();
    const props = renderPicker();

    await user.type(screen.getByLabelText("CEP"), "20040020");
    await user.type(screen.getByLabelText("Número"), "50");
    await user.type(screen.getByLabelText("Complemento"), "Sala 3");
    await user.click(screen.getByRole("button", { name: "Buscar endereço" }));

    expect(props.onAddress).toHaveBeenCalledWith(CREATED);
    expect(
      await screen.findByText("Endereço confirmado: Rua da Assembleia, 50 — Sala 3 · Rio de Janeiro/RJ"),
    ).toBeInTheDocument();
  });

  it("400 duplicado com endereço no cache seleciona o salvo", async () => {
    const user = userEvent.setup();
    const props = renderPicker({
      onSave: vi.fn().mockRejectedValue(duplicateError()),
      findByKey: vi.fn().mockReturnValue(SAVED),
    });

    await user.type(screen.getByLabelText("CEP"), "01310100");
    await user.type(screen.getByLabelText("Número"), "1000");
    await user.click(screen.getByRole("button", { name: "Buscar endereço" }));

    expect(props.onAddress).toHaveBeenLastCalledWith(SAVED);
    expect(
      await screen.findByText("Este endereço já estava salvo: Avenida Paulista, 1000 · São Paulo/SP"),
    ).toBeInTheDocument();
  });

  it("400 duplicado sem cache alerta o dead-end e não devolve endereço", async () => {
    const user = userEvent.setup();
    const props = renderPicker({ onSave: vi.fn().mockRejectedValue(duplicateError()) });

    await user.type(screen.getByLabelText("CEP"), "01310100");
    await user.type(screen.getByLabelText("Número"), "1000");
    await user.click(screen.getByRole("button", { name: "Buscar endereço" }));

    expect(
      await screen.findByText(/Este endereço já está cadastrado, mas não está salvo neste navegador/),
    ).toBeInTheDocument();
    expect(props.onAddress).toHaveBeenLastCalledWith(null);
  });

  it("erro genérico (ViaCEP fora do ar) mostra a mensagem traduzida", async () => {
    const user = userEvent.setup();
    const props = renderPicker({
      onSave: vi.fn().mockRejectedValue({
        isAxiosError: true,
        message: "Request failed with status code 500",
        response: { status: 500, data: { message: "internal server error", code: 500 } },
      }),
    });

    await user.type(screen.getByLabelText("CEP"), "01310100");
    await user.type(screen.getByLabelText("Número"), "1000");
    await user.click(screen.getByRole("button", { name: "Buscar endereço" }));

    expect(await screen.findByText("Erro interno no servidor")).toBeInTheDocument();
    expect(props.onAddress).toHaveBeenLastCalledWith(null);
  });

  it("alterna para endereços salvos e devolve o selecionado", async () => {
    const user = userEvent.setup();
    const props = renderPicker({ addresses: [SAVED] });

    await user.click(screen.getByRole("button", { name: "Endereços salvos" }));

    expect(props.onAddress).toHaveBeenLastCalledWith(SAVED);
    expect(screen.getByLabelText("Usar endereço salvo")).toBeInTheDocument();
  });

  it("sem endereços salvos o botão fica desabilitado", () => {
    renderPicker();

    expect(screen.getByRole("button", { name: "Endereços salvos" })).toBeDisabled();
  });
});
