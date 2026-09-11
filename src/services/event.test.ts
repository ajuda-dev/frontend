import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventItem, Pageable } from "../types/api";
import { api } from "./api";
import { findEventById, listEvents } from "./event";

// `isApiError` precisa ser o real (a implementação de findEventById depende dele
// para mapear 404 → null); só a instância `api` é dublada.
vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, api: { get: vi.fn() } };
});

const mockedGet = vi.mocked(api.get);

function axiosErrorWithStatus(status: number) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: { message: "erro", code: status } },
  });
}

function event(id: string): EventItem {
  return {
    id,
    title: `Evento ${id}`,
    description: "descrição",
    category: "COMMUNITY_EVENT",
    type: "ONLINE",
    start_at: "2026-10-01T18:00:00-03:00",
    duration_min: 60,
  };
}

function page(data: EventItem[], hasNext: boolean): Pageable<EventItem> {
  return { data, has_next: hasNext };
}

describe("listEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("monta a URL com page e limit padrão", async () => {
    mockedGet.mockResolvedValue({ data: page([event("e1")], false) });

    const result = await listEvents({ page: 2 });

    expect(mockedGet).toHaveBeenCalledWith("/event", {
      params: { page: 2, limit: 10 },
      signal: undefined,
    });
    expect(result.data.map((item) => item.id)).toEqual(["e1"]);
  });

  it("envia categoria, formato e cidade em minúsculas", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });

    await listEvents({ page: 1, category: "MENTORING", type: "HYBRID", city: "  São Paulo " });

    expect(mockedGet).toHaveBeenCalledWith("/event", {
      params: {
        page: 1,
        limit: 10,
        category: "MENTORING",
        type: "HYBRID",
        city: "são paulo",
      },
      signal: undefined,
    });
  });

  it("filtros vazios não viram parâmetros", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });

    await listEvents({ page: 1, category: "", type: "", city: "   ", upcoming: false });

    expect(mockedGet).toHaveBeenCalledWith("/event", {
      params: { page: 1, limit: 10 },
      signal: undefined,
    });
  });

  it("upcoming só é enviado quando ligado", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });

    await listEvents({ page: 1, upcoming: true });

    expect(mockedGet).toHaveBeenCalledWith("/event", {
      params: { page: 1, limit: 10, upcoming: true },
      signal: undefined,
    });
  });

  it("envia community_id quando informado", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });

    await listEvents({ page: 1, communityId: "c1" });

    expect(mockedGet).toHaveBeenCalledWith("/event", {
      params: { page: 1, limit: 10, community_id: "c1" },
      signal: undefined,
    });
  });

  it("repassa o AbortSignal", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });
    const controller = new AbortController();

    await listEvents({ page: 1, signal: controller.signal });

    expect(mockedGet).toHaveBeenCalledWith("/event", {
      params: { page: 1, limit: 10 },
      signal: controller.signal,
    });
  });
});

describe("findEventById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("busca direto na rota por id, em uma única requisição", async () => {
    const found = event("e2");
    mockedGet.mockResolvedValue({ data: found });

    const result = await findEventById("e2");

    expect(result).toEqual(found);
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledWith("/event/e2", { signal: undefined });
  });

  it("repassa o AbortSignal", async () => {
    mockedGet.mockResolvedValue({ data: event("e1") });
    const controller = new AbortController();

    await findEventById("e1", controller.signal);

    expect(mockedGet).toHaveBeenCalledWith("/event/e1", { signal: controller.signal });
  });

  it("traduz 404 em null (inexistente ou removido)", async () => {
    mockedGet.mockRejectedValue(axiosErrorWithStatus(404));

    await expect(findEventById("inexistente")).resolves.toBeNull();
  });

  it("propaga outros erros para a página exibir o alerta", async () => {
    mockedGet.mockRejectedValue(axiosErrorWithStatus(500));

    await expect(findEventById("e1")).rejects.toBeTruthy();
  });
});
