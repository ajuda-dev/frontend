import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMemberships } from "./useMemberships";

vi.mock("../services/community", () => ({
  joinCommunity: vi.fn(),
  leaveCommunity: vi.fn(),
}));

import { joinCommunity, leaveCommunity } from "../services/community";

const mockedJoin = vi.mocked(joinCommunity);
const mockedLeave = vi.mocked(leaveCommunity);

function apiError(status: number, message = "erro") {
  return {
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    response: { status, data: { message, code: status } },
  };
}

describe("useMemberships", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("join 201 marca como membro e persiste por usuário", async () => {
    mockedJoin.mockResolvedValue({ id: "m1", community_id: "c1", user_id: "u1" });
    const { result } = renderHook(() => useMemberships("u1"));

    await act(async () => {
      await result.current.join("c1");
    });

    expect(result.current.isMember("c1")).toBe(true);
    expect(result.current.notice).toBeNull();
    expect(localStorage.getItem("ajudadev.memberships.u1")).toBe(JSON.stringify(["c1"]));
  });

  it("join 400 marca como membro e emite aviso informativo", async () => {
    mockedJoin.mockRejectedValue(apiError(400));
    const { result } = renderHook(() => useMemberships("u1"));

    await act(async () => {
      await result.current.join("c1");
    });

    expect(result.current.isMember("c1")).toBe(true);
    expect(result.current.notice).toEqual({
      tone: "info",
      message: "Você já é membro desta comunidade.",
    });
  });

  it("join 404 não marca e alerta comunidade não encontrada", async () => {
    mockedJoin.mockRejectedValue(apiError(404));
    const { result } = renderHook(() => useMemberships("u1"));

    await act(async () => {
      await result.current.join("c1");
    });

    expect(result.current.isMember("c1")).toBe(false);
    expect(result.current.notice).toEqual({
      tone: "error",
      message: "Comunidade não encontrada.",
    });
  });

  it("leave 204 desmarca", async () => {
    localStorage.setItem("ajudadev.memberships.u1", JSON.stringify(["c1"]));
    mockedLeave.mockResolvedValue(undefined);
    const { result } = renderHook(() => useMemberships("u1"));

    expect(result.current.isMember("c1")).toBe(true);

    await act(async () => {
      await result.current.leave("c1");
    });

    expect(result.current.isMember("c1")).toBe(false);
    expect(localStorage.getItem("ajudadev.memberships.u1")).toBe(JSON.stringify([]));
  });

  it("leave 404 desmarca e avisa que não era membro", async () => {
    localStorage.setItem("ajudadev.memberships.u1", JSON.stringify(["c1"]));
    mockedLeave.mockRejectedValue(apiError(404));
    const { result } = renderHook(() => useMemberships("u1"));

    await act(async () => {
      await result.current.leave("c1");
    });

    expect(result.current.isMember("c1")).toBe(false);
    expect(result.current.notice).toEqual({
      tone: "info",
      message: "Você não era membro desta comunidade.",
    });
  });

  it("restaura o cache do usuário e não vaza entre contas", async () => {
    localStorage.setItem("ajudadev.memberships.u1", JSON.stringify(["c1"]));
    localStorage.setItem("ajudadev.memberships.u2", JSON.stringify(["c2"]));

    const { result, rerender } = renderHook(({ userId }) => useMemberships(userId), {
      initialProps: { userId: "u1" as string | null },
    });

    expect(result.current.isMember("c1")).toBe(true);
    expect(result.current.isMember("c2")).toBe(false);

    rerender({ userId: "u2" });

    await waitFor(() => expect(result.current.isMember("c2")).toBe(true));
    expect(result.current.isMember("c1")).toBe(false);
  });

  it("sem usuário logado não chama a API", async () => {
    const { result } = renderHook(() => useMemberships(null));

    await act(async () => {
      await result.current.join("c1");
      await result.current.leave("c1");
    });

    expect(mockedJoin).not.toHaveBeenCalled();
    expect(mockedLeave).not.toHaveBeenCalled();
    expect(result.current.isMember("c1")).toBe(false);
  });

  it("dismissNotice limpa o aviso", async () => {
    mockedJoin.mockRejectedValue(apiError(400));
    const { result } = renderHook(() => useMemberships("u1"));

    await act(async () => {
      await result.current.join("c1");
    });
    expect(result.current.notice).not.toBeNull();

    act(() => result.current.dismissNotice());
    expect(result.current.notice).toBeNull();
  });

  it("join 403 de e-mail não verificado mostra a mensagem traduzida e não marca membro", async () => {
    mockedJoin.mockRejectedValue(apiError(403, "email is not verified"));
    const { result } = renderHook(() => useMemberships("u1"));

    await act(async () => {
      await result.current.join("c1");
    });

    expect(result.current.isMember("c1")).toBe(false);
    expect(result.current.notice).toEqual({
      tone: "error",
      message: "Confirme seu e-mail para continuar",
    });
  });

  it("join 429 de quota não marca membro e mostra a mensagem traduzida", async () => {
    mockedJoin.mockRejectedValue(apiError(429, "community memberships limit reached"));
    const { result } = renderHook(() => useMemberships("u1"));

    await act(async () => {
      await result.current.join("c1");
    });

    expect(result.current.isMember("c1")).toBe(false);
    expect(result.current.notice).toEqual({
      tone: "error",
      message: "Você atingiu o limite de comunidades das quais pode participar",
    });
    expect(localStorage.getItem("ajudadev.memberships.u1")).toBeNull();
  });

  it("join 429 de rate não marca membro e pede para aguardar", async () => {
    mockedJoin.mockRejectedValue(apiError(429, "too many community joins"));
    const { result } = renderHook(() => useMemberships("u1"));

    await act(async () => {
      await result.current.join("c1");
    });

    expect(result.current.isMember("c1")).toBe(false);
    expect(result.current.notice).toEqual({
      tone: "error",
      message: "Muitas entradas em comunidades. Aguarde e tente de novo",
    });
  });
});
