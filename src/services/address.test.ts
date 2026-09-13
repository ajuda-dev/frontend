import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Address, Pageable } from "../types/api";
import { api } from "./api";
import { createAddress, searchAddresses } from "./address";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn() } };
});

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);

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

function page(data: Address[], hasNext: boolean): Pageable<Address> {
  return { data, has_next: hasNext };
}

describe("searchAddresses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consulta /address com o CEP reduzido a dígitos, page 1 e limit 50", async () => {
    mockedGet.mockResolvedValue({ data: page([address()], false) });

    const result = await searchAddresses({ zipCode: "01310-100" });

    expect(mockedGet).toHaveBeenCalledWith("/address", {
      params: { zip_code: "01310100", page: 1, limit: 50 },
      signal: undefined,
    });
    expect(result.map((item) => item.id)).toEqual(["a1"]);
  });

  it("converte {data, has_next} na lista de endereços", async () => {
    mockedGet.mockResolvedValue({
      data: page([address({ id: "a1" }), address({ id: "a2", number: "2000" })], true),
    });

    const result = await searchAddresses({ zipCode: "01310100" });

    expect(result.map((item) => item.id)).toEqual(["a1", "a2"]);
  });

  it("repassa o AbortSignal", async () => {
    mockedGet.mockResolvedValue({ data: page([], false) });
    const controller = new AbortController();

    await searchAddresses({ zipCode: "01310100", signal: controller.signal });

    expect(mockedGet).toHaveBeenCalledWith("/address", {
      params: { zip_code: "01310100", page: 1, limit: 50 },
      signal: controller.signal,
    });
  });

  it("propaga o erro da API (quem chama decide se é best-effort)", async () => {
    mockedGet.mockRejectedValue(
      Object.assign(new Error("Request failed with status code 400"), {
        isAxiosError: true,
        response: { status: 400, data: { message: "invalid search address data", code: 400 } },
      }),
    );

    await expect(searchAddresses({ zipCode: "013" })).rejects.toThrow();
  });
});

describe("createAddress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("envia só CEP e número quando não há complemento", async () => {
    mockedPost.mockResolvedValue({ data: address() });

    await createAddress({ zip_code: "01310100", number: "1000" });

    expect(mockedPost).toHaveBeenCalledWith("/address/register", {
      zip_code: "01310100",
      number: "1000",
    });
  });

  it("inclui o complemento quando informado", async () => {
    mockedPost.mockResolvedValue({ data: address({ complement: "Sala 5" }) });

    await createAddress({ zip_code: "01310100", number: "1000", complement: " Sala 5 " });

    expect(mockedPost).toHaveBeenCalledWith("/address/register", {
      zip_code: "01310100",
      number: "1000",
      complement: "Sala 5",
    });
  });
});
