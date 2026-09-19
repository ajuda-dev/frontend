import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Community, Pageable } from "../types/api";
import { api } from "./api";
import {
  createCommunity,
  deleteCommunity,
  findCommunityById,
  joinCommunity,
  leaveCommunity,
  listCommunities,
  listUserCommunities,
  updateCommunity,
} from "./community";

// `isApiError` precisa ser o real (a implementação de findCommunityById depende dele
// para mapear 404 → null); só a instância `api` é dublada.
vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
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

function community(id: string): Community {
  return { id, name: `Comunidade ${id}`, description: "descrição" };
}

function page(data: Community[], hasNext: boolean): Pageable<Community> {
  return { data, has_next: hasNext };
}

describe("listCommunities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("monta a URL com page e limit padrão", async () => {
    mockedGet.mockResolvedValue({ data: page([community("c1")], false) });

    const result = await listCommunities({ page: 2 });

    expect(mockedGet).toHaveBeenCalledWith("/community", {
      params: { page: 2, limit: 10 },
      signal: undefined,
    });
    expect(result.data.map((item) => item.id)).toEqual(["c1"]);
  });

  it("envia a cidade em minúsculas (busca por substring no backend)", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });

    await listCommunities({ page: 1, city: "  São Paulo " });

    expect(mockedGet).toHaveBeenCalledWith("/community", {
      params: { page: 1, limit: 10, city: "são paulo" },
      signal: undefined,
    });
  });

  it("cidade vazia não vira filtro", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });

    await listCommunities({ page: 1, city: "   " });

    expect(mockedGet).toHaveBeenCalledWith("/community", {
      params: { page: 1, limit: 10 },
      signal: undefined,
    });
  });

  it("envia o nome em minúsculas (busca por substring no backend)", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });

    await listCommunities({ page: 1, name: "  Dev SP " });

    expect(mockedGet).toHaveBeenCalledWith("/community", {
      params: { page: 1, limit: 10, name: "dev sp" },
      signal: undefined,
    });
  });

  it("nome vazio não vira filtro", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });

    await listCommunities({ page: 1, name: "  " });

    expect(mockedGet).toHaveBeenCalledWith("/community", {
      params: { page: 1, limit: 10 },
      signal: undefined,
    });
  });

  it("envia owner_id para o recorte minhas comunidades", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });

    await listCommunities({ page: 1, ownerId: "u1" });

    expect(mockedGet).toHaveBeenCalledWith("/community", {
      params: { page: 1, limit: 10, owner_id: "u1" },
      signal: undefined,
    });
  });

  it("ownerId vazio não vira filtro", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });

    await listCommunities({ page: 1, ownerId: "" });

    expect(mockedGet).toHaveBeenCalledWith("/community", {
      params: { page: 1, limit: 10 },
      signal: undefined,
    });
  });

  it("combina cidade, nome e owner_id no mesmo request", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });

    await listCommunities({ page: 3, city: "Sao Paulo", name: "Dev", ownerId: "u1" });

    expect(mockedGet).toHaveBeenCalledWith("/community", {
      params: { page: 3, limit: 10, city: "sao paulo", name: "dev", owner_id: "u1" },
      signal: undefined,
    });
  });

  it("repassa o AbortSignal", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });
    const controller = new AbortController();

    await listCommunities({ page: 1, signal: controller.signal });

    expect(mockedGet).toHaveBeenCalledWith("/community", {
      params: { page: 1, limit: 10 },
      signal: controller.signal,
    });
  });
});

describe("listUserCommunities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("chama /user/<id>/communities com page e limit padrão", async () => {
    mockedGet.mockResolvedValue({ data: page([community("c1")], false) });

    const result = await listUserCommunities({ userId: "u1", page: 1 });

    expect(mockedGet).toHaveBeenCalledWith("/user/u1/communities", {
      params: { page: 1, limit: 10 },
      signal: undefined,
    });
    expect(result.data.map((item) => item.id)).toEqual(["c1"]);
  });

  it("repassa a página pedida e o AbortSignal", async () => {
    mockedGet.mockResolvedValue({ data: page([], true) });
    const controller = new AbortController();

    const result = await listUserCommunities({ userId: "u1", page: 3, signal: controller.signal });

    expect(mockedGet).toHaveBeenCalledWith("/user/u1/communities", {
      params: { page: 3, limit: 10 },
      signal: controller.signal,
    });
    expect(result.has_next).toBe(true);
  });
});

describe("joinCommunity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz POST no path de join e devolve o membership", async () => {
    mockedPost.mockResolvedValue({
      data: { id: "m1", community_id: "c1", user_id: "u1" },
    });

    const result = await joinCommunity("c1");

    expect(mockedPost).toHaveBeenCalledWith("/community/c1/join");
    expect(result.community_id).toBe("c1");
  });
});

describe("leaveCommunity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz DELETE no path de leave", async () => {
    mockedDelete.mockResolvedValue({ data: undefined });

    await leaveCommunity("c1");

    expect(mockedDelete).toHaveBeenCalledWith("/community/c1/leave");
  });
});

describe("createCommunity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz POST em /community/register com nome, descrição e endereço", async () => {
    mockedPost.mockResolvedValue({ data: community("c1") });

    const result = await createCommunity({
      name: "Dev SP",
      description: "Encontros de dev",
      address_id: "a1",
    });

    expect(mockedPost).toHaveBeenCalledWith("/community/register", {
      name: "Dev SP",
      description: "Encontros de dev",
      address_id: "a1",
    });
    expect(result.id).toBe("c1");
  });
});

describe("updateCommunity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz PUT em /community/<id> com nome, descrição e endereço", async () => {
    mockedPut.mockResolvedValue({ data: community("c1") });

    const result = await updateCommunity("c1", {
      name: "Dev SP",
      description: "Encontros de dev",
      address_id: "a1",
    });

    expect(mockedPut).toHaveBeenCalledWith("/community/c1", {
      name: "Dev SP",
      description: "Encontros de dev",
      address_id: "a1",
    });
    expect(result.id).toBe("c1");
  });

  it("envia somente os campos informados (PATCH parcial)", async () => {
    mockedPut.mockResolvedValue({ data: community("c1") });

    await updateCommunity("c1", { name: "Dev SP" });

    expect(mockedPut).toHaveBeenCalledWith("/community/c1", { name: "Dev SP" });
  });

  it("repassa configVisibility sem reescrever as chaves", async () => {
    mockedPut.mockResolvedValue({ data: community("c1") });

    await updateCommunity("c1", {
      configVisibility: { github: { value: "https://github.com/devsp" } },
    });

    expect(mockedPut).toHaveBeenCalledWith("/community/c1", {
      configVisibility: { github: { value: "https://github.com/devsp" } },
    });
  });
});

describe("deleteCommunity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz DELETE no path da comunidade", async () => {
    mockedDelete.mockResolvedValue({ data: undefined });

    await deleteCommunity("c1");

    expect(mockedDelete).toHaveBeenCalledWith("/community/c1");
  });
});

describe("findCommunityById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("busca direto na rota por id, em uma única requisição", async () => {
    const found = community("c2");
    mockedGet.mockResolvedValue({ data: found });

    const result = await findCommunityById("c2");

    expect(result).toEqual(found);
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledWith("/community/c2", { signal: undefined });
  });

  it("repassa o AbortSignal", async () => {
    mockedGet.mockResolvedValue({ data: community("c1") });
    const controller = new AbortController();

    await findCommunityById("c1", controller.signal);

    expect(mockedGet).toHaveBeenCalledWith("/community/c1", { signal: controller.signal });
  });

  it("traduz 404 em null (inexistente ou arquivada)", async () => {
    mockedGet.mockRejectedValue(axiosErrorWithStatus(404));

    await expect(findCommunityById("inexistente")).resolves.toBeNull();
  });

  it("propaga outros erros para a página exibir o alerta", async () => {
    mockedGet.mockRejectedValue(axiosErrorWithStatus(500));

    await expect(findCommunityById("c1")).rejects.toBeTruthy();
  });
});
