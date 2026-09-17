import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventUser } from "../types/api";
import { api } from "./api";
import {
  addParticipant,
  cancelParticipation,
  getParticipants,
  joinEvent,
  updateParticipantStatus,
} from "./eventUser";

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

function eventUser(overrides: Partial<EventUser> = {}): EventUser {
  return {
    id: "p1",
    event_id: "e1",
    user_id: "u1",
    role: "ATTENDEE",
    status: "CONFIRMED",
    ...overrides,
  };
}

describe("joinEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz POST em /event/:id/join sem body (o participante vem do token)", async () => {
    mockedPost.mockResolvedValue({ data: eventUser() });

    const result = await joinEvent("e1");

    expect(mockedPost).toHaveBeenCalledWith("/event/e1/join");
    expect(result.status).toBe("CONFIRMED");
  });
});

describe("addParticipant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz POST em /event/:id/participants com user_id e papel", async () => {
    mockedPost.mockResolvedValue({ data: eventUser({ role: "SPEAKER" }) });

    const result = await addParticipant("e1", { userId: "u2", role: "SPEAKER" });

    expect(mockedPost).toHaveBeenCalledWith("/event/e1/participants", {
      user_id: "u2",
      role: "SPEAKER",
    });
    expect(result.role).toBe("SPEAKER");
  });

  it("mentorado é convidado com papel MENTEE (o backend responde REQUESTED)", async () => {
    mockedPost.mockResolvedValue({ data: eventUser({ role: "MENTEE", status: "REQUESTED" }) });

    const result = await addParticipant("e1", { userId: "u2", role: "MENTEE" });

    expect(mockedPost).toHaveBeenCalledWith("/event/e1/participants", {
      user_id: "u2",
      role: "MENTEE",
    });
    expect(result.status).toBe("REQUESTED");
  });
});

describe("getParticipants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("busca em /event/:id/participants sem params quando o status não é informado", async () => {
    mockedGet.mockResolvedValue({ data: [eventUser()] });

    const result = await getParticipants("e1");

    expect(mockedGet).toHaveBeenCalledWith("/event/e1/participants", {
      params: undefined,
      signal: undefined,
    });
    expect(result).toHaveLength(1);
  });

  it("envia o filtro status e repassa o AbortSignal", async () => {
    mockedGet.mockResolvedValue({ data: [] });
    const controller = new AbortController();

    await getParticipants("e1", "REQUESTED", controller.signal);

    expect(mockedGet).toHaveBeenCalledWith("/event/e1/participants", {
      params: { status: "REQUESTED" },
      signal: controller.signal,
    });
  });

  it("status vazio não vira filtro", async () => {
    mockedGet.mockResolvedValue({ data: [] });

    await getParticipants("e1", "");

    expect(mockedGet).toHaveBeenCalledWith("/event/e1/participants", {
      params: undefined,
      signal: undefined,
    });
  });
});

describe("updateParticipantStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz PUT no status do participante (aceite do convite)", async () => {
    mockedPut.mockResolvedValue({ data: eventUser({ role: "MENTEE" }) });

    const result = await updateParticipantStatus("e1", "u2", "CONFIRMED");

    expect(mockedPut).toHaveBeenCalledWith("/event/e1/participants/u2/status", {
      status: "CONFIRMED",
    });
    expect(result.status).toBe("CONFIRMED");
  });

  it("envia comment opcional no aceite quando informado", async () => {
    mockedPut.mockResolvedValue({
      data: eventUser({ role: "MENTEE", comment: "Combinado pelo LinkedIn" }),
    });

    await updateParticipantStatus("e1", "u2", "CONFIRMED", "  Combinado pelo LinkedIn  ");

    expect(mockedPut).toHaveBeenCalledWith("/event/e1/participants/u2/status", {
      status: "CONFIRMED",
      comment: "Combinado pelo LinkedIn",
    });
  });

  it("envia REJECTED com comment na recusa do convite", async () => {
    mockedPut.mockResolvedValue({
      data: eventUser({ role: "MENTEE", status: "REJECTED", comment: "Agenda conflitou" }),
    });

    const result = await updateParticipantStatus("e1", "u2", "REJECTED", "Agenda conflitou");

    expect(mockedPut).toHaveBeenCalledWith("/event/e1/participants/u2/status", {
      status: "REJECTED",
      comment: "Agenda conflitou",
    });
    expect(result.status).toBe("REJECTED");
  });

  it("envia comment vazio no REJECTED para o backend validar", async () => {
    mockedPut.mockResolvedValue({ data: eventUser({ role: "MENTEE", status: "REJECTED" }) });

    await updateParticipantStatus("e1", "u2", "REJECTED", "   ");

    expect(mockedPut).toHaveBeenCalledWith("/event/e1/participants/u2/status", {
      status: "REJECTED",
      comment: "",
    });
  });
});

describe("cancelParticipation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz DELETE no participante e devolve o EventUserDto (200 com body)", async () => {
    mockedDelete.mockResolvedValue({ data: eventUser({ status: "CANCELLED" }) });

    const result = await cancelParticipation("e1", "u1");

    expect(mockedDelete).toHaveBeenCalledWith("/event/e1/participants/u1");
    expect(result?.status).toBe("CANCELLED");
  });

  it("tolera resposta sem body (204) devolvendo null", async () => {
    mockedDelete.mockResolvedValue({ data: undefined });

    await expect(cancelParticipation("e1", "u1")).resolves.toBeNull();
  });
});
