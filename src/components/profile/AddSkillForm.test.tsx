import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Pageable, Skill } from "../../types/api";
import { AddSkillForm } from "./AddSkillForm";

vi.mock("../../services/skill", () => ({ listSkills: vi.fn(), createSkill: vi.fn() }));

import { createSkill, listSkills } from "../../services/skill";

const mockedListSkills = vi.mocked(listSkills);
const mockedCreateSkill = vi.mocked(createSkill);

function skill(id: string, name: string): Skill {
  return { id, name };
}

function page(data: Skill[], hasNext = false): Pageable<Skill> {
  return { data, has_next: hasNext };
}

function duplicateError() {
  return {
    isAxiosError: true,
    message: "Request failed with status code 400",
    response: {
      status: 400,
      data: {
        message: "invalid skill user data",
        code: 400,
        causes: [{ field: "user_id", message: "user already has this skill" }],
      },
    },
  };
}

function renderForm(onAdd = vi.fn().mockResolvedValue(undefined)) {
  render(<AddSkillForm onAdd={onAdd} />);
  return { onAdd };
}

describe("AddSkillForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListSkills.mockResolvedValue(page([skill("s1", "GO"), skill("s2", "JAVA")]));
  });

  it("submit sem habilidade é bloqueado sem chamar onAdd", async () => {
    const user = userEvent.setup();
    const { onAdd } = renderForm();

    await screen.findByRole("radio", { name: "JAVA" });
    await user.click(screen.getByRole("button", { name: "Adicionar habilidade" }));

    expect(await screen.findByText("Escolha uma habilidade do catálogo.")).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("sem nível escolhido o submit também é bloqueado", async () => {
    const user = userEvent.setup();
    const { onAdd } = renderForm();

    await user.click(await screen.findByRole("radio", { name: "GO" }));
    await user.click(screen.getByRole("button", { name: "Adicionar habilidade" }));

    expect(await screen.findByText("Escolha o nível de domínio.")).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("com habilidade e nível chama onAdd com o objeto do catálogo e reseta o formulário", async () => {
    const user = userEvent.setup();
    const { onAdd } = renderForm();

    await user.click(await screen.findByRole("radio", { name: "GO" }));
    await user.selectOptions(screen.getByLabelText("Nível de domínio"), "TEACH");
    await user.click(screen.getByRole("button", { name: "Adicionar habilidade" }));

    expect(onAdd).toHaveBeenCalledWith({ id: "s1", name: "GO" }, "TEACH");
    expect(await screen.findByRole("radio", { name: "Nenhuma habilidade" })).toBeChecked();
  });

  it("duplicado mostra a orientação de mudar nível", async () => {
    const user = userEvent.setup();
    const { onAdd } = renderForm(vi.fn().mockRejectedValue(duplicateError()));

    await user.click(await screen.findByRole("radio", { name: "GO" }));
    await user.selectOptions(screen.getByLabelText("Nível de domínio"), "TEACH");
    await user.click(screen.getByRole("button", { name: "Adicionar habilidade" }));

    expect(
      await screen.findByText(
        "Você já tem esta habilidade. Para mudar o nível, use o seletor na linha dela abaixo.",
      ),
    ).toBeInTheDocument();
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("habilidade fora do catálogo pode ser cadastrada e sai selecionada para adicionar", async () => {
    const user = userEvent.setup();
    const created = skill("s9", "JAVA");
    mockedListSkills.mockResolvedValue(page([]));
    mockedCreateSkill.mockResolvedValue(created);
    const { onAdd } = renderForm();

    await user.type(screen.getByLabelText("Buscar habilidade no catálogo"), "JAVA");
    await user.click(await screen.findByRole("button", { name: 'Cadastrar "JAVA" no catálogo' }));

    expect(await screen.findByRole("radio", { name: "JAVA" })).toBeChecked();
    await user.selectOptions(screen.getByLabelText("Nível de domínio"), "TEACH");
    await user.click(screen.getByRole("button", { name: "Adicionar habilidade" }));

    expect(onAdd).toHaveBeenCalledWith(created, "TEACH");
  });
});
