import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Pageable, Skill } from "../../types/api";
import { SkillPicker } from "./SkillPicker";

vi.mock("../../services/skill", () => ({ listSkills: vi.fn(), createSkill: vi.fn() }));

import { createSkill, listSkills } from "../../services/skill";

const mockedList = vi.mocked(listSkills);
const mockedCreate = vi.mocked(createSkill);

function skill(id: string, name: string): Skill {
  return { id, name };
}

function page(data: Skill[], hasNext = false): Pageable<Skill> {
  return { data, has_next: hasNext };
}

function apiError(status: number, data: unknown) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data },
  });
}

function renderPicker(
  props: Partial<{
    selected: Skill | null;
    onSelect: (skill: Skill | null) => void;
    allowCreate: boolean;
    showClear: boolean;
  }> = {},
) {
  const onSelect = props.onSelect ?? vi.fn();
  render(
    <SkillPicker
      selected={props.selected ?? null}
      onSelect={onSelect}
      allowCreate={props.allowCreate ?? false}
      showClear={props.showClear ?? true}
    />,
  );
  return { onSelect };
}

describe("SkillPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista as habilidades do catálogo", async () => {
    mockedList.mockResolvedValue(page([skill("s1", "GO"), skill("s2", "JAVA")]));
    renderPicker();

    expect(await screen.findByRole("radio", { name: "JAVA" })).toBeInTheDocument();
    expect(mockedList).toHaveBeenCalledWith({ page: 1, name: "" });
  });

  it("selecionar uma habilidade avisa a página com o objeto completo", async () => {
    const java = skill("s2", "JAVA");
    mockedList.mockResolvedValue(page([java]));
    const user = userEvent.setup();
    const { onSelect } = renderPicker();

    await user.click(await screen.findByRole("radio", { name: "JAVA" }));

    expect(onSelect).toHaveBeenCalledWith(java);
  });

  it("a habilidade selecionada fica marcada mesmo fora da página atual", async () => {
    const selected = skill("pre-1", "RUST");
    mockedList.mockResolvedValue(page([skill("s1", "GO")]));
    renderPicker({ selected });

    expect(await screen.findByRole("radio", { name: "RUST" })).toBeChecked();
  });

  it("a opção todas as habilidades limpa a seleção", async () => {
    mockedList.mockResolvedValue(page([skill("s1", "GO")]));
    const user = userEvent.setup();
    const { onSelect } = renderPicker({ selected: skill("s1", "GO") });

    await user.click(screen.getByRole("radio", { name: "Todas as habilidades" }));

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("com showClear false não há opção de limpar nem fieldset vazio", async () => {
    mockedList.mockResolvedValue(page([]));
    renderPicker({ showClear: false });

    expect(
      await screen.findByText("O catálogo ainda não tem habilidades cadastradas."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("a busca vai com debounce para o catálogo", async () => {
    mockedList.mockResolvedValue(page([skill("s1", "GO")]));
    const user = userEvent.setup();
    renderPicker();
    await screen.findByRole("radio", { name: "GO" });

    await user.type(screen.getByLabelText("Buscar habilidade no catálogo"), "jav");

    await waitFor(() => {
      expect(mockedList).toHaveBeenLastCalledWith({ page: 1, name: "jav" });
    });
  });

  it("catálogo vazio sem busca usa a mensagem de catálogo", async () => {
    mockedList.mockResolvedValue(page([]));
    renderPicker();

    expect(
      await screen.findByText("O catálogo ainda não tem habilidades cadastradas."),
    ).toBeInTheDocument();
  });

  it("sem allowCreate a busca sem resultado não oferece cadastro", async () => {
    mockedList.mockResolvedValue(page([]));
    const user = userEvent.setup();
    renderPicker();

    await user.type(screen.getByLabelText("Buscar habilidade no catálogo"), "JAVA");

    expect(
      await screen.findByText("Nenhuma habilidade começa com esse termo."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cadastrar/ })).not.toBeInTheDocument();
  });

  it("com allowCreate o termo sem resultado pode ser cadastrado e já sai selecionado", async () => {
    mockedList.mockResolvedValue(page([]));
    const created = skill("s9", "JAVA");
    mockedCreate.mockResolvedValue(created);
    const user = userEvent.setup();
    const { onSelect } = renderPicker({ allowCreate: true });

    await user.type(screen.getByLabelText("Buscar habilidade no catálogo"), "JAVA");
    await user.click(await screen.findByRole("button", { name: 'Cadastrar "JAVA" no catálogo' }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledWith("JAVA"));
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(created));
    await waitFor(() => expect(mockedList).toHaveBeenLastCalledWith({ page: 1, name: "JAVA" }));
  });

  it("nome já existente no cadastro mostra o erro e refaz a busca", async () => {
    mockedList.mockResolvedValue(page([]));
    mockedCreate.mockRejectedValue(
      apiError(400, {
        message: "Invalid skill data",
        causes: [{ field: "name", message: "Skill already exists" }],
      }),
    );
    const user = userEvent.setup();
    renderPicker({ allowCreate: true });

    await user.type(screen.getByLabelText("Buscar habilidade no catálogo"), "GO");
    const button = await screen.findByRole("button", { name: 'Cadastrar "GO" no catálogo' });
    const callsBefore = mockedList.mock.calls.length;
    await user.click(button);

    expect(
      await screen.findByText("Já existe uma habilidade com este nome"),
    ).toBeInTheDocument();
    await waitFor(() => expect(mockedList.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it("mostra erro com opção de tentar novamente", async () => {
    mockedList.mockRejectedValue(
      Object.assign(new Error("falhou"), {
        isAxiosError: true,
        response: { status: 500, data: { message: "erro", code: 500 } },
      }),
    );
    renderPicker();

    expect(await screen.findByText("Não foi possível carregar as habilidades")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });
});
