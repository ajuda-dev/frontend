import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Pageable, Skill, UserWithSkills } from "../../types/api";
import { PersonPicker } from "./PersonPicker";

vi.mock("../../services/user", () => ({ listUsers: vi.fn() }));
vi.mock("../../services/skill", () => ({ listSkills: vi.fn() }));

import { listSkills } from "../../services/skill";
import { listUsers } from "../../services/user";

const mockedListUsers = vi.mocked(listUsers);
const mockedListSkills = vi.mocked(listSkills);

function person(id: string, name: string, skills: Skill[] = []): UserWithSkills {
  return { id, name, skills };
}

function page(data: UserWithSkills[], hasNext = false): Pageable<UserWithSkills> {
  return { data, has_next: hasNext };
}

function skillPage(data: Skill[], hasNext = false): Pageable<Skill> {
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
    selected: UserWithSkills | null;
    onSelect: (person: UserWithSkills | null) => void;
    excludeIds: string[];
    allowEmpty: boolean;
  }> = {},
) {
  const onSelect = props.onSelect ?? vi.fn();
  render(
    <PersonPicker
      selected={props.selected ?? null}
      onSelect={onSelect}
      excludeIds={props.excludeIds}
      allowEmpty={props.allowEmpty}
    />,
  );
  return { onSelect };
}

describe("PersonPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListSkills.mockResolvedValue(skillPage([{ id: "s1", name: "GO" }]));
  });

  it("lista as pessoas e avisa a página ao selecionar", async () => {
    const ana = person("u2", "Ana", [{ id: "s1", name: "GO" }]);
    mockedListUsers.mockResolvedValue(page([ana]));
    const user = userEvent.setup();
    const { onSelect } = renderPicker();

    await user.click(await screen.findByRole("radio", { name: /Ana/ }));

    expect(onSelect).toHaveBeenCalledWith(ana);
    expect(mockedListUsers).toHaveBeenCalledWith({ page: 1, skill: undefined, name: "" });
  });

  it("mostra as habilidades ao lado do nome", async () => {
    mockedListUsers.mockResolvedValue(page([person("u2", "Ana", [{ id: "s1", name: "GO" }])]));
    renderPicker();

    expect((await screen.findByRole("radio", { name: /Ana/ })).closest("label")).toHaveTextContent(
      "GO",
    );
  });

  it("busca por nome depois do debounce", async () => {
    mockedListUsers.mockResolvedValue(page([person("u2", "Ana")]));
    const user = userEvent.setup();
    renderPicker();
    await screen.findByRole("radio", { name: "Ana" });

    await user.type(screen.getByLabelText("Buscar por nome"), "ana");

    await waitFor(() => {
      expect(mockedListUsers).toHaveBeenLastCalledWith({ page: 1, skill: undefined, name: "ana" });
    });
  });

  it("selecionar uma habilidade filtra pelo nome exato do catálogo", async () => {
    mockedListUsers.mockResolvedValue(page([person("u2", "Ana")]));
    const user = userEvent.setup();
    renderPicker();
    await screen.findByRole("radio", { name: "Ana" });

    await user.click(await screen.findByRole("radio", { name: "GO" }));

    await waitFor(() => {
      expect(mockedListUsers).toHaveBeenLastCalledWith({ page: 1, skill: "GO", name: "" });
    });
  });

  it("excludeIds esconde a pessoa logada da lista", async () => {
    mockedListUsers.mockResolvedValue(
      page([person("u1", "Lucas Rocha"), person("u2", "Ana")]),
    );
    renderPicker({ excludeIds: ["u1"] });

    expect(await screen.findByRole("radio", { name: "Ana" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Lucas Rocha" })).not.toBeInTheDocument();
  });

  it("allowEmpty oferece a opção de não convidar agora", async () => {
    mockedListUsers.mockResolvedValue(page([person("u2", "Ana")]));
    const user = userEvent.setup();
    const { onSelect } = renderPicker({
      allowEmpty: true,
      selected: person("u2", "Ana"),
    });

    expect(await screen.findByRole("radio", { name: "Sem convite agora" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Sem convite agora" }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("lista vazia com filtros usa a mensagem de filtros", async () => {
    mockedListUsers.mockResolvedValue(page([]));
    const user = userEvent.setup();
    renderPicker();
    await screen.findByText("Ainda não há pessoas cadastradas na plataforma.");

    await user.type(screen.getByLabelText("Buscar por nome"), "zzz");

    await waitFor(() => {
      expect(screen.getByText("Ninguém corresponde a esses filtros.")).toBeInTheDocument();
    });
  });

  it("erro mostra alerta com tentar novamente", async () => {
    mockedListUsers.mockRejectedValue(apiError(500, { message: "erro", code: 500 }));
    renderPicker();

    expect(await screen.findByText("Não foi possível carregar as pessoas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("carregar mais busca a próxima página", async () => {
    mockedListUsers.mockResolvedValueOnce(page([person("u2", "Ana")], true));
    mockedListUsers.mockResolvedValueOnce(page([person("u3", "Bruno")], false));
    const user = userEvent.setup();
    renderPicker();
    await screen.findByRole("radio", { name: "Ana" });

    await user.click(screen.getByRole("button", { name: "Carregar mais" }));

    expect(await screen.findByRole("radio", { name: "Bruno" })).toBeInTheDocument();
    expect(mockedListUsers).toHaveBeenLastCalledWith({ page: 2, skill: undefined, name: "" });
  });
});
