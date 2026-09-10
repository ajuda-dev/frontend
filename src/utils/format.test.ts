import { describe, expect, it } from "vitest";
import { formatAddress, formatCep, formatDate, formatDateTime } from "./format";

describe("formatDateTime / formatDate", () => {
  it("formata ISO com fuso fixo America/Sao_Paulo (independente da máquina)", () => {
    expect(formatDateTime("2026-09-15T14:30:00Z")).toBe("15/09/2026, 11:30");
    expect(formatDateTime("2026-09-15T14:30:00-03:00")).toBe("15/09/2026, 14:30");
    expect(formatDate("2026-09-15T14:30:00Z")).toBe("terça-feira, 15 de setembro de 2026");
  });
});

describe("formatCep", () => {
  it("mascara 8 dígitos", () => {
    expect(formatCep("01310100")).toBe("01310-100");
    expect(formatCep("01310-100")).toBe("01310-100");
  });

  it("mantém valores fora do padrão", () => {
    expect(formatCep("123")).toBe("123");
  });
});

describe("formatAddress", () => {
  it("endereço completo", () => {
    expect(
      formatAddress({
        street: "Av. Paulista",
        number: "1000",
        complement: "Sala 5",
        city: "São Paulo",
        state: "SP",
      }),
    ).toBe("Av. Paulista, 1000 — Sala 5 · São Paulo/SP");
  });

  it("sem logradouro", () => {
    expect(formatAddress({ city: "Curitiba", state: "PR" })).toBe("Curitiba/PR");
  });

  it("nulo/vazio", () => {
    expect(formatAddress(null)).toBe("");
    expect(formatAddress(undefined)).toBe("");
  });
});
