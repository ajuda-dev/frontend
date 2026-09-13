import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Pageable, Skill } from "../../types/api";
import { SkillPicker } from "./SkillPicker";

vi.mock("../../services/skill", () => ({ listSkills: vi.fn() }));

import { listSkills } from "../../services/skill";

const mockedList = vi.mocked(listSkills);

function skill(id: string, name: string): Skill {
  return { id, name };
}

function page(data: Skill[], hasNext = false): Pageable<Skill> {
  return { data, has_next: hasNext };
}

function renderPicker(
  props: Partial<{ selected: Skill | null; onSelect: (skill: Skill | null) => void }> = {},
) {
  const onSelect = props.onSelect ?? vi.fn();
  render(<SkillPicker selected={props.selected ?? null} onSelect={onSelect} />);
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
