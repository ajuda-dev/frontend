import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Address } from "../types/api";
import { useAddresses } from "./useAddresses";

vi.mock("../services/address", () => ({
  createAddress: vi.fn(),
}));

import { createAddress } from "../services/address";

const mockedCreate = vi.mocked(createAddress);

function address(overrides: Partial<Address> = {}): Address {
  return {
    id: "a1",
    zip_code: "01310100",
    street: "Avenida Paulista",
    number: "1000",
    city: "São Paulo",
    state: "SP",
    ...overrides,
  };
}

describe("useAddresses", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("save cria o endereço e persiste no cache do usuário", async () => {
    mockedCreate.mockResolvedValue(address());
    const { result } = renderHook(() => useAddresses("u1"));

    await act(async () => {
      await result.current.save({ zip_code: "01310100", number: "1000" });
    });

    expect(mockedCreate).toHaveBeenCalledWith({ zip_code: "01310100", number: "1000" });
    expect(result.current.addresses.map((item) => item.id)).toEqual(["a1"]);
    expect(JSON.parse(localStorage.getItem("ajudadev.addresses.u1") ?? "[]")).toHaveLength(1);
  });

  it("restaura o cache do usuário e não vaza entre contas", async () => {
    localStorage.setItem("ajudadev.addresses.u1", JSON.stringify([address({ id: "a1" })]));
    localStorage.setItem(
      "ajudadev.addresses.u2",
      JSON.stringify([address({ id: "a2", zip_code: "20040020" })]),
    );

    const { result, rerender } = renderHook(({ userId }) => useAddresses(userId), {
      initialProps: { userId: "u1" as string | null },
    });

    expect(result.current.addresses.map((item) => item.id)).toEqual(["a1"]);

    rerender({ userId: "u2" });

    await waitFor(() => expect(result.current.addresses.map((item) => item.id)).toEqual(["a2"]));
  });

  it("findByKey casa CEP + número + complemento", async () => {
    localStorage.setItem(
      "ajudadev.addresses.u1",
      JSON.stringify([address({ id: "a1", complement: "Sala 5" })]),
    );
    const { result } = renderHook(() => useAddresses("u1"));

    expect(
      result.current.findByKey({ zip_code: "01310-100", number: "1000", complement: "sala 5" })?.id,
    ).toBe("a1");
    expect(result.current.findByKey({ zip_code: "01310100", number: "1001" })).toBeNull();
    expect(result.current.findByKey({ zip_code: "01310100", number: "1000" })).toBeNull();
  });

  it("cache corrompido não quebra o hook", () => {
    localStorage.setItem("ajudadev.addresses.u1", "{isso não é json");
    const { result } = renderHook(() => useAddresses("u1"));

    expect(result.current.addresses).toEqual([]);
  });

  it("sem usuário logado não persiste nada", async () => {
    mockedCreate.mockResolvedValue(address());
    const { result } = renderHook(() => useAddresses(null));

    await act(async () => {
      await result.current.save({ zip_code: "01310100", number: "1000" });
    });

    expect(result.current.addresses.map((item) => item.id)).toEqual(["a1"]);
    expect(localStorage.getItem("ajudadev.addresses.null")).toBeNull();
  });
});
