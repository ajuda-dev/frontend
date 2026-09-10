import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Pageable } from "../types/api";
import { usePageable } from "./usePageable";

interface Item {
  id: string;
}

function page(ids: string[], hasNext: boolean): Pageable<Item> {
  return { data: ids.map((id) => ({ id })), has_next: hasNext };
}

describe("usePageable", () => {
  it("carrega a primeira página no mount", async () => {
    const fetcher = vi.fn().mockResolvedValue(page(["a", "b"], true));
    const { result } = renderHook(() => usePageable<Item>(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenCalledWith(1);
    expect(result.current.items.map((item) => item.id)).toEqual(["a", "b"]);
    expect(result.current.hasNext).toBe(true);
  });

  it("loadMore faz append e deduplica por id", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(page(["a", "b"], true))
      .mockResolvedValueOnce(page(["b", "c"], false));
    const { result } = renderHook(() => usePageable<Item>(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenLastCalledWith(2);
    expect(result.current.items.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(result.current.hasNext).toBe(false);
  });

  it("não busca mais páginas quando has_next é falso", async () => {
    const fetcher = vi.fn().mockResolvedValue(page(["a"], false));
    const { result } = renderHook(() => usePageable<Item>(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.loadMore());

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("erro na primeira página limpa a lista e expõe o erro", async () => {
    const failure = new Error("falhou");
    const fetcher = vi.fn().mockRejectedValue(failure);
    const { result } = renderHook(() => usePageable<Item>(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(failure);
    expect(result.current.items).toEqual([]);
    expect(result.current.hasNext).toBe(false);
  });

  it("reset volta para a página 1 e substitui a lista", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(page(["a", "b"], true))
      .mockResolvedValueOnce(page(["z"], false));
    const { result } = renderHook(() => usePageable<Item>(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.reset());

    await waitFor(() => expect(result.current.items.map((item) => item.id)).toEqual(["z"]));
    expect(fetcher).toHaveBeenLastCalledWith(1);
    expect(result.current.page).toBe(1);
  });
});
