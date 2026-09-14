import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventUser } from "../types/api";
import { useParticipants } from "./useParticipants";

vi.mock("../services/eventUser", () => ({
  joinEvent: vi.fn(),
  cancelParticipation: vi.fn(),
  getParticipants: vi.fn(),
  addParticipant: vi.fn(),
  updateParticipantStatus: vi.fn(),
}));

import {
  addParticipant,
  cancelParticipation,
  getParticipants,
  joinEvent,
  updateParticipantStatus,
} from "../services/eventUser";

const mockedGet = vi.mocked(getParticipants);
const mockedJoin = vi.mocked(joinEvent);
const mockedCancel = vi.mocked(cancelParticipation);
const mockedAdd = vi.mocked(addParticipant);
const mockedUpdate = vi.mocked(updateParticipantStatus);

function apiError(status: number, message: string) {
  return {
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    response: { status, data: { message, code: status } },
  };
}

function row(overrides: Partial<EventUser> = {}): EventUser {
  return {
    id: "p1",
    event_id: "e1",
    user_id: "u1",
    role: "ATTENDEE",
    status: "CONFIRMED",
    ...overrides,
  };
}

async function renderParticipants(userId: string | null = "u1", onMutated?: () => void) {
  const rendered = renderHook(() => useParticipants("e1", userId, onMutated));
  await waitFor(() => expect(rendered.result.current.loading).toBe(false));
  return rendered;
}

describe("useParticipants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGet.mockResolvedValue([]);
  });

  it("carrega a lista e deriva minha linha e a contagem de confirmados", async () => {
    mockedGet.mockResolvedValue([
      row({ id: "p1", user_id: "u1", status: "CONFIRMED" }),
      row({ id: "p2", user_id: "u2", status: "REQUESTED" }),
      row({ id: "p3", user_id: "u3", status: "CONFIRMED" }),
    ]);
    const { result } = await renderParticipants("u1");

    expect(result.current.myRow?.user_id).toBe("u1");
    expect(result.current.confirmedCount).toBe(2);
  });

  it("join não envia user_id (o backend usa o dono do token) e o refetch mostra CONFIRMED", async () => {
    mockedGet.mockResolvedValueOnce([]).mockResolvedValueOnce([row({ user_id: "u1" })]);
    mockedJoin.mockResolvedValue(row({ user_id: "u1" }));
    const { result } = await renderParticipants();

    await act(async () => {
      await result.current.join();
    });

    expect(mockedJoin).toHaveBeenCalledWith("e1");
    expect(result.current.myRow?.status).toBe("CONFIRMED");
    expect(result.current.failure).toBeNull();
  });

  it("cancel faz DELETE com meu user_id e o refetch mostra CANCELLED", async () => {
    mockedGet
      .mockResolvedValueOnce([row({ user_id: "u1" })])
      .mockResolvedValueOnce([row({ user_id: "u1", status: "CANCELLED" })]);
    mockedCancel.mockResolvedValue(row({ user_id: "u1", status: "CANCELLED" }));
    const { result } = await renderParticipants();

    await act(async () => {
      await result.current.cancel();
    });

    expect(mockedCancel).toHaveBeenCalledWith("e1", "u1");
    expect(result.current.myRow?.status).toBe("CANCELLED");
  });

  it("accept confirma o convite de mentoria (PUT CONFIRMED)", async () => {
    mockedGet
      .mockResolvedValueOnce([row({ user_id: "u1", role: "MENTEE", status: "REQUESTED" })])
      .mockResolvedValueOnce([row({ user_id: "u1", role: "MENTEE", status: "CONFIRMED" })]);
    mockedUpdate.mockResolvedValue(row({ user_id: "u1", role: "MENTEE" }));
    const { result } = await renderParticipants();

    await act(async () => {
      await result.current.accept();
    });

    expect(mockedUpdate).toHaveBeenCalledWith("e1", "u1", "CONFIRMED");
    expect(result.current.myRow?.status).toBe("CONFIRMED");
  });

  it("reject recusa o convite (PUT REJECTED)", async () => {
    mockedGet
      .mockResolvedValueOnce([row({ user_id: "u1", role: "MENTEE", status: "REQUESTED" })])
      .mockResolvedValueOnce([row({ user_id: "u1", role: "MENTEE", status: "REJECTED" })]);
    mockedUpdate.mockResolvedValue(row({ user_id: "u1", role: "MENTEE", status: "REJECTED" }));
    const { result } = await renderParticipants();

    await act(async () => {
      await result.current.reject();
    });

    expect(mockedUpdate).toHaveBeenCalledWith("e1", "u1", "REJECTED");
    expect(result.current.myRow?.status).toBe("REJECTED");
  });

  it("add envia o papel e reflete o status devolvido pelo backend", async () => {
    mockedGet
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        row({ id: "p9", user_id: "u9", role: "MENTEE", status: "REQUESTED" }),
      ]);
    mockedAdd.mockResolvedValue(row({ id: "p9", user_id: "u9", role: "MENTEE", status: "REQUESTED" }));
    const { result } = await renderParticipants();

    await act(async () => {
      await result.current.add("u9", "MENTEE");
    });

    expect(mockedAdd).toHaveBeenCalledWith("e1", { userId: "u9", role: "MENTEE" });
    expect(result.current.participants[0]?.status).toBe("REQUESTED");
  });

  it("remove usa chave por participante e o refetch reflete a saída", async () => {
    mockedGet
      .mockResolvedValueOnce([row({ id: "p2", user_id: "u2" })])
      .mockResolvedValueOnce([row({ id: "p2", user_id: "u2", status: "CANCELLED" })]);
    mockedCancel.mockResolvedValue(row({ id: "p2", user_id: "u2", status: "CANCELLED" }));
    const { result } = await renderParticipants();

    await act(async () => {
      await result.current.remove("u2");
    });

    expect(mockedCancel).toHaveBeenCalledWith("e1", "u2");
    expect(result.current.participants[0]?.status).toBe("CANCELLED");
  });

  it("erro em uma ação fica na sua chave e o refetch concilia o estado", async () => {
    mockedGet
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([row({ user_id: "u1" })]);
    mockedJoin.mockRejectedValue(apiError(400, "user is already a participant of this event"));
    const { result } = await renderParticipants();

    await act(async () => {
      await result.current.join();
    });

    expect(result.current.failure).toEqual({
      key: "join",
      message: "Este usuário já participa deste evento",
    });
    expect(result.current.myRow?.status).toBe("CONFIRMED");

    // A ação seguinte limpa o erro anterior e segue funcionando.
    mockedGet.mockResolvedValueOnce([row({ user_id: "u1", status: "CANCELLED" })]);
    mockedCancel.mockResolvedValue(row({ user_id: "u1", status: "CANCELLED" }));
    await act(async () => {
      await result.current.cancel();
    });

    expect(result.current.failure).toBeNull();
    expect(result.current.myRow?.status).toBe("CANCELLED");
  });

  it("loading é por ação: uma pendente não bloqueia as outras", async () => {
    mockedGet.mockResolvedValue([row({ id: "p2", user_id: "u2" })]);
    mockedJoin.mockImplementation(() => new Promise(() => {}));
    const { result } = await renderParticipants();

    act(() => {
      void result.current.join();
    });
    await waitFor(() => expect(result.current.isPending("join")).toBe(true));
    expect(result.current.isPending("remove:u2")).toBe(false);

    mockedGet.mockResolvedValueOnce([row({ id: "p2", user_id: "u2", status: "CANCELLED" })]);
    mockedCancel.mockResolvedValue(row({ id: "p2", user_id: "u2", status: "CANCELLED" }));
    await act(async () => {
      await result.current.remove("u2");
    });

    expect(mockedCancel).toHaveBeenCalledWith("e1", "u2");
  });

  it("onMutated é chamado após mutação bem-sucedida", async () => {
    const onMutated = vi.fn();
    mockedGet.mockResolvedValueOnce([]).mockResolvedValueOnce([row({ user_id: "u1" })]);
    mockedJoin.mockResolvedValue(row({ user_id: "u1" }));
    const { result } = await renderParticipants("u1", onMutated);

    await act(async () => {
      await result.current.join();
    });

    expect(onMutated).toHaveBeenCalledTimes(1);
  });

  it("sem usuário logado as ações não chamam a API", async () => {
    const { result } = await renderParticipants(null);

    await act(async () => {
      await result.current.join();
      await result.current.cancel();
      await result.current.accept();
      await result.current.reject();
    });

    expect(mockedJoin).not.toHaveBeenCalled();
    expect(mockedCancel).not.toHaveBeenCalled();
    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(result.current.myRow).toBeNull();
  });

  it("troca de evento zera a lista do anterior e recarrega", async () => {
    mockedGet
      .mockResolvedValueOnce([row({ user_id: "u1" })])
      .mockResolvedValueOnce([row({ id: "p2", user_id: "u2" })]);
    const { result, rerender } = renderHook(({ eventId }) => useParticipants(eventId, "u1"), {
      initialProps: { eventId: "e1" },
    });
    await waitFor(() => expect(result.current.participants).toHaveLength(1));

    rerender({ eventId: "e2" });

    await waitFor(() => expect(result.current.participants[0]?.user_id).toBe("u2"));
    expect(result.current.myRow).toBeNull();
    expect(mockedGet).toHaveBeenLastCalledWith("e2");
  });

  it("erro no fetch fica em error e o refetch se recupera", async () => {
    mockedGet
      .mockRejectedValueOnce(apiError(500, "internal server error"))
      .mockResolvedValueOnce([row()]);
    const { result } = renderHook(() => useParticipants("e1", "u1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.participants).toHaveLength(1);
  });
});
