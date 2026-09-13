import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Pageable, SkillUser, UserProfile, UserWithSkills } from "../types/api";
import { api } from "./api";
import { deleteUser, getUserProfile, getUserSkills, listUsers, removeUserSkill } from "./user";

// `isApiError` precisa ser o real (getUserProfile depende dele para mapear 404 → null);
// só a instância `api` é dublada.
vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  };
});

const mockedGet = vi.mocked(api.get);
const mockedDelete = vi.mocked(api.delete);

function axiosErrorWithStatus(status: number) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: { message: "erro", code: status } },
  });
}

function person(id: string, name: string): UserWithSkills {
  return { id, name, skills: [{ id: "s1", name: "GOLANG" }] };
}

function page(data: UserWithSkills[], hasNext: boolean): Pageable<UserWithSkills> {
  return { data, has_next: hasNext };
}

function profile(id: string): UserProfile {
  return {
    id,
    name: "Lucas Rocha",
    description: "Dev backend",
    email: "lucas@ajudadev.dev",
    configVisibility: { email: { value: "lucas@ajudadev.dev", shareWithCommunity: true } },
  };
}

describe("listUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("monta a URL com page e limit padrão quando não há filtros", async () => {
    mockedGet.mockResolvedValue({ data: page([person("u1", "Lucas")], false) });

    const result = await listUsers({ page: 1 });

    expect(mockedGet).toHaveBeenCalledWith("/user", {
      params: { page: 1, limit: 10 },
      signal: undefined,
    });
    expect(result.data.map((item) => item.name)).toEqual(["Lucas"]);
  });

  it("envia skill e name quando informados", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });

    await listUsers({ page: 2, skill: "GOLANG", name: "lucas" });

    expect(mockedGet).toHaveBeenCalledWith("/user", {
      params: { page: 2, limit: 10, skill: "GOLANG", name: "lucas" },
      signal: undefined,
    });
  });

  it("filtros em branco não viram query", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });

    await listUsers({ page: 1, skill: "  ", name: "   " });

    expect(mockedGet).toHaveBeenCalledWith("/user", {
      params: { page: 1, limit: 10 },
      signal: undefined,
    });
  });

  it("repassa o AbortSignal", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });
    const controller = new AbortController();

    await listUsers({ page: 1, signal: controller.signal });

    expect(mockedGet).toHaveBeenCalledWith("/user", {
      params: { page: 1, limit: 10 },
      signal: controller.signal,
    });
  });
});

describe("getUserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("busca na rota por id", async () => {
    const found = profile("u1");
    mockedGet.mockResolvedValue({ data: found });

    await expect(getUserProfile("u1")).resolves.toEqual(found);
    expect(mockedGet).toHaveBeenCalledWith("/user/u1", { signal: undefined });
  });

  it("traduz 404 em null (inexistente ou arquivado)", async () => {
    mockedGet.mockRejectedValue(axiosErrorWithStatus(404));

    await expect(getUserProfile("inexistente")).resolves.toBeNull();
  });

  it("propaga outros erros", async () => {
    mockedGet.mockRejectedValue(axiosErrorWithStatus(500));

    await expect(getUserProfile("u1")).rejects.toBeTruthy();
  });
});

describe("getUserSkills", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("busca as skills do usuário no path aninhado", async () => {
    const skills: SkillUser[] = [
      { id: "su1", skill_id: "s1", user_id: "u1", level: "TEACH", skill: { id: "s1", name: "GO" } },
    ];
    mockedGet.mockResolvedValue({ data: skills });

    await expect(getUserSkills("u1")).resolves.toEqual(skills);
    expect(mockedGet).toHaveBeenCalledWith("/user/u1/skills", { signal: undefined });
  });
});

describe("removeUserSkill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz DELETE no path aninhado da skill do usuário", async () => {
    mockedDelete.mockResolvedValue({ data: undefined });

    await removeUserSkill("u1", "s1");

    expect(mockedDelete).toHaveBeenCalledWith("/user/u1/skills/s1");
  });
});

describe("deleteUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz DELETE no path do usuário", async () => {
    mockedDelete.mockResolvedValue({ data: undefined });

    await deleteUser("u1");

    expect(mockedDelete).toHaveBeenCalledWith("/user/u1");
  });
});
