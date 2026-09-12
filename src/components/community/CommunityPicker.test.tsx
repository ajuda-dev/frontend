import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Community, Pageable } from "../../types/api";
import { CommunityPicker } from "./CommunityPicker";

vi.mock("../../services/community", () => ({ listCommunities: vi.fn() }));

import { listCommunities } from "../../services/community";

const mockedList = vi.mocked(listCommunities);

function community(id: string, name: string, city = "São Paulo"): Community {
  return {
    id,
    name,
    description: "Comunidade de testes",
    address: { id: `a-${id}`, zip_code: "01001000", city, state: "SP" },
  };
}

function page(data: Community[], hasNext = false): Pageable<Community> {
  return { data, has_next: hasNext };
}

function renderPicker(
  props: Partial<{
    selected: Community | null;
    onSelect: (community: Community | null) => void;
  }> = {},
) {
  const onSelect = props.onSelect ?? vi.fn();
  render(
    <CommunityPicker ownerId="u1" selected={props.selected ?? null} onSelect={onSelect} />,
  );
  return { onSelect };
}

describe("CommunityPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista as comunidades do dono usando owner_id", async () => {
    mockedList.mockResolvedValue(page([community("c1", "Dev SP")]));
    renderPicker();

    expect(await screen.findByRole("radio", { name: /Dev SP/ })).toBeInTheDocument();
    expect(mockedList).toHaveBeenCalledWith({ page: 1, name: "", ownerId: "u1" });
  });

  it("mostra a cidade do endereço ao lado do nome", async () => {
    mockedList.mockResolvedValue(page([community("c1", "Dev SP", "Recife")]));
    renderPicker();

    expect(await screen.findByText("Recife/SP")).toBeInTheDocument();
  });

  it("selecionar uma comunidade avisa a página com o objeto completo", async () => {
    const devSp = community("c1", "Dev SP");
    mockedList.mockResolvedValue(page([devSp]));
    const user = userEvent.setup();
    const { onSelect } = renderPicker();

    await user.click(await screen.findByRole("radio", { name: /Dev SP/ }));

    expect(onSelect).toHaveBeenCalledWith(devSp);
  });

  it("a opção sem comunidade limpa a seleção", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderPicker({ selected: community("c1", "Dev SP") });

    await user.click(screen.getByRole("radio", { name: /Sem comunidade/ }));

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("a comunidade selecionada fica marcada mesmo fora da página atual", async () => {
    const selected = community("pre-1", "Comunidade de origem");
    mockedList.mockResolvedValue(page([community("c1", "Dev SP")]));
    renderPicker({ selected });

    expect(await screen.findByRole("radio", { name: /Comunidade de origem/ })).toBeChecked();
    expect(await screen.findByRole("radio", { name: /Dev SP/ })).not.toBeChecked();
  });

  it("sem seleção a opção sem comunidade fica marcada", async () => {
    mockedList.mockResolvedValue(page([community("c1", "Dev SP")]));
    renderPicker();

    expect(await screen.findByRole("radio", { name: /Sem comunidade/ })).toBeChecked();
  });

  it("a busca por nome vai com debounce e reseta para a página 1", async () => {
    mockedList.mockResolvedValue(page([community("c1", "Dev SP")]));
    const user = userEvent.setup();
    renderPicker();

    await screen.findByRole("radio", { name: /Dev SP/ });
    await user.type(screen.getByLabelText("Buscar comunidade pelo nome"), "Recife");

    await waitFor(() =>
      expect(mockedList).toHaveBeenLastCalledWith({ page: 1, name: "Recife", ownerId: "u1" }),
    );
  });

  it("lista vazia sem busca avisa que o usuário não criou comunidades", async () => {
    mockedList.mockResolvedValue(page([]));
    renderPicker();

    expect(await screen.findByText("Você ainda não criou nenhuma comunidade.")).toBeInTheDocument();
  });

  it("lista vazia com busca usa a mensagem de busca", async () => {
    mockedList.mockResolvedValue(page([]));
    const user = userEvent.setup();
    renderPicker();

    await user.type(screen.getByLabelText("Buscar comunidade pelo nome"), "zzz");

    expect(await screen.findByText("Nenhuma comunidade sua com esse nome.")).toBeInTheDocument();
  });

  it("erro mostra Alert com Tentar novamente e recarrega", async () => {
    mockedList
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(page([community("c1", "Dev SP")]));
    const user = userEvent.setup();
    renderPicker();

    expect(
      await screen.findByText("Não foi possível carregar as comunidades"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByRole("radio", { name: /Dev SP/ })).toBeInTheDocument();
  });

  it("Carregar mais busca a próxima página e faz append", async () => {
    mockedList
      .mockResolvedValueOnce(page([community("c1", "Dev SP")], true))
      .mockResolvedValueOnce(page([community("c2", "Dev RJ")]));
    const user = userEvent.setup();
    renderPicker();

    await screen.findByRole("radio", { name: /Dev SP/ });
    await user.click(screen.getByRole("button", { name: "Carregar mais" }));

    expect(await screen.findByRole("radio", { name: /Dev RJ/ })).toBeInTheDocument();
    expect(mockedList).toHaveBeenLastCalledWith({ page: 2, name: "", ownerId: "u1" });
  });

  it("sem has_next não mostra Carregar mais", async () => {
    mockedList.mockResolvedValue(page([community("c1", "Dev SP")]));
    renderPicker();

    await screen.findByRole("radio", { name: /Dev SP/ });
    expect(screen.queryByRole("button", { name: "Carregar mais" })).not.toBeInTheDocument();
  });
});
