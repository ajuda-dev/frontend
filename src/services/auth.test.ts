import { describe, expect, it } from "vitest";
import { githubLoginUrl } from "./auth";

describe("githubLoginUrl", () => {
  // Sem VITE_API_BASE_URL a navegação sai no mesmo host (proxy do Vite em dev),
  // que é o que mantém os cookies do OAuth (state e sessão) no domínio certo.
  it("aponta para o início do OAuth na base da API", () => {
    expect(githubLoginUrl()).toBe("/v1/auth/github/login");
  });
});
