import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventItem, Pageable } from "../types/api";
import { api } from "./api";
import { createEvent, deleteEvent, findEventById, listEvents, approveEvent, publishEvent, rescheduleEvent } from "./event";

// `isApiError` precisa ser o real (a implementação de findEventById depende dele
// para mapear 404 → null); só a instância `api` é dublada.
vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), put: vi.fn() } };
});

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);
const mockedDelete = vi.mocked(api.delete);
const mockedPut = vi.mocked(api.put);

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

  it("envia approval_status junto do community_id (fila de aprovação)", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });

    await listEvents({ page: 1, communityId: "c1", approvalStatus: "PENDING" });

    expect(mockedGet).toHaveBeenCalledWith("/event", {
      params: { page: 1, limit: 10, community_id: "c1", approval_status: "PENDING" },
      signal: undefined,
    });
  });

  it("approval_status sem community_id não é enviado (o backend responde 403)", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });

    await listEvents({ page: 1, approvalStatus: "REJECTED" });

    expect(mockedGet).toHaveBeenCalledWith("/event", {
      params: { page: 1, limit: 10 },
      signal: undefined,
    });
  });

  it("envia os filtros da agenda pessoal (user_id com papel/status)", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });

    await listEvents({ page: 1, userId: "u1", role: "MENTEE", status: "REQUESTED" });

    expect(mockedGet).toHaveBeenCalledWith("/event", {
      params: { page: 1, limit: 10, user_id: "u1", role: "MENTEE", status: "REQUESTED" },
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

describe("createEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz POST em /event/register com os campos obrigatórios", async () => {
    mockedPost.mockResolvedValue({ data: event("e1") });

    const result = await createEvent({
      title: "Meetup Dev SP",
      description: "Encontro mensal",
      category: "COMMUNITY_EVENT",
      type: "ONLINE",
      start_at: "2026-10-01T21:00:00.000Z",
      duration_min: 90,
    });

    expect(mockedPost).toHaveBeenCalledWith("/event/register", {
      title: "Meetup Dev SP",
      description: "Encontro mensal",
      category: "COMMUNITY_EVENT",
      type: "ONLINE",
      start_at: "2026-10-01T21:00:00.000Z",
      duration_min: 90,
    });
    expect(result.id).toBe("e1");
  });

  it("evento ONLINE nunca envia address_id", async () => {
    mockedPost.mockResolvedValue({ data: event("e1") });

    await createEvent({
      title: "Webinar",
      description: "Online",
      category: "WEBINAR",
      type: "ONLINE",
      start_at: "2026-10-01T21:00:00.000Z",
      duration_min: 60,
      address_id: "a1",
    });

    const body = mockedPost.mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty("address_id");
  });

  it("omite campos opcionais vazios (link, vagas, comunidade, endereço)", async () => {
    mockedPost.mockResolvedValue({ data: event("e1") });

    await createEvent({
      title: "Meetup",
      description: "descrição",
      category: "COMMUNITY_EVENT",
      type: "ONLINE",
      start_at: "2026-10-01T21:00:00.000Z",
      duration_min: 60,
      meeting_link: "   ",
      max_slots: null,
      community_id: "",
      address_id: undefined,
    });

    expect(mockedPost).toHaveBeenCalledWith("/event/register", {
      title: "Meetup",
      description: "descrição",
      category: "COMMUNITY_EVENT",
      type: "ONLINE",
      start_at: "2026-10-01T21:00:00.000Z",
      duration_min: 60,
    });
  });

  it("envia endereço, link, vagas e comunidade quando informados", async () => {
    mockedPost.mockResolvedValue({ data: event("e1") });

    await createEvent({
      title: "Híbrido",
      description: "descrição",
      category: "WEBINAR",
      type: "HYBRID",
      start_at: "2026-10-01T21:00:00.000Z",
      duration_min: 120,
      meeting_link: " https://meet.example.com/x ",
      max_slots: 30,
      community_id: "c1",
      address_id: "a1",
    });

    expect(mockedPost).toHaveBeenCalledWith("/event/register", {
      title: "Híbrido",
      description: "descrição",
      category: "WEBINAR",
      type: "HYBRID",
      start_at: "2026-10-01T21:00:00.000Z",
      duration_min: 120,
      meeting_link: "https://meet.example.com/x",
      max_slots: 30,
      community_id: "c1",
      address_id: "a1",
    });
  });

  it("MENTORING não envia max_slots (o backend força 2)", async () => {
    mockedPost.mockResolvedValue({ data: event("e1") });

    await createEvent({
      title: "Mentoria",
      description: "1:1",
      category: "MENTORING",
      type: "ONLINE",
      start_at: "2026-10-01T21:00:00.000Z",
      duration_min: 60,
      max_slots: null,
    });

    const body = mockedPost.mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty("max_slots");
  });

  it("MENTORING envia creator_role quando informado", async () => {
    mockedPost.mockResolvedValue({ data: event("e1") });

    await createEvent({
      title: "Mentoria",
      description: "1:1",
      category: "MENTORING",
      type: "ONLINE",
      start_at: "2026-10-01T21:00:00.000Z",
      duration_min: 60,
      creator_role: "MENTEE",
    });

    const body = mockedPost.mock.calls[0][1] as Record<string, unknown>;
    expect(body.creator_role).toBe("MENTEE");
  });

  it("creator_role fora de MENTORING é omitido (o backend responde 400)", async () => {
    mockedPost.mockResolvedValue({ data: event("e1") });

    await createEvent({
      title: "Meetup",
      description: "descrição",
      category: "COMMUNITY_EVENT",
      type: "ONLINE",
      start_at: "2026-10-01T21:00:00.000Z",
      duration_min: 60,
      creator_role: "MENTOR",
    });

    const body = mockedPost.mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty("creator_role");
  });
});

describe("deleteEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz DELETE no path do evento com comment no body", async () => {
    mockedDelete.mockResolvedValue({ data: undefined });

    await deleteEvent("e1", "  Evento cancelado pelo organizador  ");

    expect(mockedDelete).toHaveBeenCalledWith("/event/e1", {
      data: { comment: "Evento cancelado pelo organizador" },
    });
  });
});

describe("approveEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz PUT em /event/:id/approval com o status e devolve o evento atualizado", async () => {
    const approved = { ...event("e1"), status: "APPROVED" as const };
    mockedPut.mockResolvedValue({ data: approved });

    const result = await approveEvent("e1", "APPROVED");

    expect(mockedPut).toHaveBeenCalledWith("/event/e1/approval", { status: "APPROVED" });
    expect(result).toEqual(approved);
  });

  it("rejeitar usa o mesmo endpoint com REJECTED", async () => {
    mockedPut.mockResolvedValue({ data: { ...event("e1"), status: "REJECTED" } });

    await approveEvent("e1", "REJECTED");

    expect(mockedPut).toHaveBeenCalledWith("/event/e1/approval", { status: "REJECTED" });
  });
});

describe("rescheduleEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz PUT em /event/:id/reschedule com start_at e comment trimado", async () => {
    const updated = { ...event("e1"), start_at: "2026-11-02T23:00:00.000Z" };
    mockedPut.mockResolvedValue({ data: updated });

    const result = await rescheduleEvent("e1", {
      startAt: "2026-11-02T23:00:00.000Z",
      comment: "  Novo horário  ",
    });

    expect(mockedPut).toHaveBeenCalledWith("/event/e1/reschedule", {
      start_at: "2026-11-02T23:00:00.000Z",
      comment: "Novo horário",
    });
    expect(result).toEqual(updated);
  });
});

describe("publishEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz PUT em /event/:id/visibility com PUBLIC", async () => {
    const published = { ...event("e1"), visibility: "PUBLIC" as const };
    mockedPut.mockResolvedValue({ data: published });

    const result = await publishEvent("e1");

    expect(mockedPut).toHaveBeenCalledWith("/event/e1/visibility", { visibility: "PUBLIC" });
    expect(result).toEqual(published);
  });
});
