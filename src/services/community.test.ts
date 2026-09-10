import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Community, Pageable } from "../types/api";
import { api } from "./api";
import { findCommunityById, joinCommunity, leaveCommunity, listCommunities } from "./community";

vi.mock("./api", () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);
const mockedDelete = vi.mocked(api.delete);

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

describe("findCommunityById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("encontra na primeira página", async () => {
    mockedGet.mockResolvedValue({ data: page([community("c1"), community("c2")], true) });

    const found = await findCommunityById("c2");

    expect(found?.id).toBe("c2");
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledWith("/community", {
      params: { page: 1, limit: 100 },
      signal: undefined,
    });
  });

  it("encontra em uma página seguinte", async () => {
    mockedGet
      .mockResolvedValueOnce({ data: page([community("c1")], true) })
      .mockResolvedValueOnce({ data: page([community("c9")], false) });

    const found = await findCommunityById("c9");

    expect(found?.id).toBe("c9");
    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(mockedGet).toHaveBeenLastCalledWith("/community", {
      params: { page: 2, limit: 100 },
      signal: undefined,
    });
  });

  it("para quando has_next é falso e devolve null", async () => {
    mockedGet.mockResolvedValue({ data: page([community("c1")], false) });

    const found = await findCommunityById("inexistente");

    expect(found).toBeNull();
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it("desiste após 20 páginas", async () => {
    mockedGet.mockResolvedValue({ data: page([community("c1")], true) });

    const found = await findCommunityById("inexistente");

    expect(found).toBeNull();
    expect(mockedGet).toHaveBeenCalledTimes(20);
  });
});
