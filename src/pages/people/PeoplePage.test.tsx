import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import type { Pageable, Skill, UserWithSkills } from "../../types/api";
import { PeoplePage } from "./PeoplePage";

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

function seedSession() {
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" }),
  );
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/pessoas"]}>
      <AuthProvider>
        <PeoplePage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("PeoplePage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    seedSession();
    mockedListSkills.mockResolvedValue(skillPage([{ id: "s1", name: "GO" }]));
  });

  it("sem filtros lista todas as pessoas", async () => {
    mockedListUsers.mockResolvedValue(page([person("u2", "Ana", [{ id: "s1", name: "GO" }])]));
    renderPage();

    expect(await screen.findByText("Ana")).toBeInTheDocument();
    expect(mockedListUsers).toHaveBeenCalledWith({ page: 1, skill: undefined, name: "" });
  });

  it("mostra as habilidades de cada pessoa no card", async () => {
    mockedListUsers.mockResolvedValue(
      page([person("u2", "Ana", [{ id: "s1", name: "GO" }, { id: "s2", name: "JAVA" }])]),
    );
    renderPage();

    expect(await screen.findByText("JAVA")).toBeInTheDocument();
  });

  it("busca por nome depois do debounce", async () => {
    mockedListUsers.mockResolvedValue(page([person("u2", "Ana")]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Ana");

    await user.type(screen.getByLabelText("Buscar por nome"), "ana");

    await waitFor(() => {
      expect(mockedListUsers).toHaveBeenLastCalledWith({ page: 1, skill: undefined, name: "ana" });
    });
  });

  it("selecionar uma habilidade filtra pelo nome exato do catálogo", async () => {
    mockedListUsers.mockResolvedValue(page([person("u2", "Ana")]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Ana");

    await user.click(await screen.findByRole("radio", { name: "GO" }));

    await waitFor(() => {
      expect(mockedListUsers).toHaveBeenLastCalledWith({ page: 1, skill: "GO", name: "" });
    });
  });

  it("lista vazia com filtros usa a mensagem de filtros", async () => {
    mockedListUsers.mockResolvedValue(page([]));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Ainda não há pessoas cadastradas na plataforma.");

    await user.type(screen.getByLabelText("Buscar por nome"), "zzz");

    await waitFor(() => {
      expect(
        screen.getByText(
          "Ninguém corresponde a esses filtros. Tente outra habilidade ou outro trecho do nome.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("erro mostra alerta com tentar novamente", async () => {
    mockedListUsers.mockRejectedValue(apiError(500, { message: "erro", code: 500 }));
    renderPage();

    expect(await screen.findByText("Não foi possível carregar as pessoas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("carregar mais busca a próxima página", async () => {
    mockedListUsers.mockResolvedValueOnce(page([person("u2", "Ana")], true));
    mockedListUsers.mockResolvedValueOnce(page([person("u3", "Bruno")], false));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Ana");

    await user.click(screen.getByRole("button", { name: "Carregar mais" }));

    expect(await screen.findByText("Bruno")).toBeInTheDocument();
    expect(mockedListUsers).toHaveBeenLastCalledWith({ page: 2, skill: undefined, name: "" });
  });

  it("o card leva para o perfil da pessoa", async () => {
    mockedListUsers.mockResolvedValue(page([person("u2", "Ana")]));
    renderPage();

    const links = await screen.findAllByRole("link", { name: /Ana|Ver perfil/ });
    expect(links[0]).toHaveAttribute("href", "/pessoas/u2");
  });
});
