import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Pageable, Skill } from "../types/api";
import { api } from "./api";
import {
  createSkill,
  deleteSkill,
  findSkillById,
  listSkills,
  updateSkill,
} from "./skill";

// `isApiError` precisa ser o real (findSkillById depende dele para mapear 404 → null);
// só a instância `api` é dublada.
vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  };
});

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);
const mockedPut = vi.mocked(api.put);
const mockedDelete = vi.mocked(api.delete);

function axiosErrorWithStatus(status: number) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: { message: "erro", code: status } },
  });
}

function skill(id: string, name: string): Skill {
  return { id, name };
}

function page(data: Skill[], hasNext: boolean): Pageable<Skill> {
  return { data, has_next: hasNext };
}

describe("listSkills", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("monta a URL com page e limit padrão", async () => {
    mockedGet.mockResolvedValue({ data: page([skill("s1", "GOLANG")], false) });

    const result = await listSkills({ page: 2 });

    expect(mockedGet).toHaveBeenCalledWith("/skill", {
      params: { page: 2, limit: 10 },
      signal: undefined,
    });
    expect(result.data.map((item) => item.name)).toEqual(["GOLANG"]);
  });

  it("envia o termo de busca como digitado (o backend normaliza para caixa alta)", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });

    await listSkills({ page: 1, name: "  go " });

    expect(mockedGet).toHaveBeenCalledWith("/skill", {
      params: { page: 1, limit: 10, name: "go" },
      signal: undefined,
    });
  });

  it("termo vazio não vira filtro", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });

    await listSkills({ page: 1, name: "   " });

    expect(mockedGet).toHaveBeenCalledWith("/skill", {
      params: { page: 1, limit: 10 },
      signal: undefined,
    });
  });

  it("repassa o AbortSignal", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });
    const controller = new AbortController();

    await listSkills({ page: 1, signal: controller.signal });

    expect(mockedGet).toHaveBeenCalledWith("/skill", {
      params: { page: 1, limit: 10 },
      signal: controller.signal,
    });
  });
});

describe("findSkillById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("busca na rota por id", async () => {
    const found = skill("s1", "GOLANG");
    mockedGet.mockResolvedValue({ data: found });

    await expect(findSkillById("s1")).resolves.toEqual(found);
    expect(mockedGet).toHaveBeenCalledWith("/skill/s1", { signal: undefined });
  });

  it("traduz 404 em null (inexistente ou arquivada)", async () => {
    mockedGet.mockRejectedValue(axiosErrorWithStatus(404));

    await expect(findSkillById("inexistente")).resolves.toBeNull();
  });

  it("propaga outros erros", async () => {
    mockedGet.mockRejectedValue(axiosErrorWithStatus(500));

    await expect(findSkillById("s1")).rejects.toBeTruthy();
  });
});

describe("createSkill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz POST em /skill/register com o nome", async () => {
    mockedPost.mockResolvedValue({ data: skill("s1", "GOLANG") });

    const result = await createSkill("GOLANG");

    expect(mockedPost).toHaveBeenCalledWith("/skill/register", { name: "GOLANG" });
    expect(result.id).toBe("s1");
  });
});

describe("updateSkill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz PUT no path da skill com o novo nome", async () => {
    mockedPut.mockResolvedValue({ data: skill("s1", "GO") });

    const result = await updateSkill("s1", "GO");

    expect(mockedPut).toHaveBeenCalledWith("/skill/s1", { name: "GO" });
    expect(result.name).toBe("GO");
  });
});

describe("deleteSkill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz DELETE no path da skill", async () => {
    mockedDelete.mockResolvedValue({ data: undefined });

    await deleteSkill("s1");

    expect(mockedDelete).toHaveBeenCalledWith("/skill/s1");
  });
});
