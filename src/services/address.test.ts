import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Address } from "../types/api";
import { createAddress } from "./address";
import { api } from "./api";

vi.mock("./api", () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const mockedPost = vi.mocked(api.post);

const ADDRESS: Address = {
  id: "a1",
  zip_code: "01310100",
  street: "Avenida Paulista",
  number: "1000",
  complement: "Sala 5",
  city: "São Paulo",
  state: "SP",
};

describe("createAddress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz POST em /address/register e devolve o endereço completo do backend", async () => {
    mockedPost.mockResolvedValue({ data: ADDRESS });

    const result = await createAddress({
      zip_code: "01310100",
      number: "1000",
      complement: "Sala 5",
    });

    expect(mockedPost).toHaveBeenCalledWith("/address/register", {
      zip_code: "01310100",
      number: "1000",
      complement: "Sala 5",
    });
    expect(result).toEqual(ADDRESS);
  });

  it("omite complemento vazio do corpo", async () => {
    mockedPost.mockResolvedValue({ data: ADDRESS });

    await createAddress({ zip_code: "01310100", number: "1000", complement: "   " });

    expect(mockedPost).toHaveBeenCalledWith("/address/register", {
      zip_code: "01310100",
      number: "1000",
    });
  });
});
