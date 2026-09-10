import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import { apiErrorBody, isApiError } from "./api";

describe("isApiError", () => {
  it("reconhece AxiosError", () => {
    expect(isApiError(new AxiosError("boom", "400"))).toBe(true);
  });

  it("rejeita erros comuns", () => {
    expect(isApiError(new Error("boom"))).toBe(false);
    expect(isApiError("boom")).toBe(false);
    expect(isApiError(null)).toBe(false);
  });
});

describe("apiErrorBody", () => {
  it("extrai o corpo rest_err da resposta", () => {
    const err = new AxiosError("Request failed", "400", undefined, undefined, {
      data: { message: "Invalid data", code: 400, causes: [{ field: "email", message: "Email is not valid" }] },
      status: 400,
      statusText: "Bad Request",
      headers: {},
      config: { headers: {} } as never,
    });
    expect(apiErrorBody(err)?.message).toBe("Invalid data");
    expect(apiErrorBody(err)?.causes?.[0]?.field).toBe("email");
  });

  it("retorna null sem corpo", () => {
    expect(apiErrorBody(new Error("x"))).toBeNull();
  });
});
