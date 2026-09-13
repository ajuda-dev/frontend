import { describe, expect, it } from "vitest";
import { NAME_MAX_LENGTH, validatePersonName } from "./nameValidation";

describe("validatePersonName", () => {
  it("recusa nome vazio ou só com espaços", () => {
    expect(validatePersonName("")).toBe("Informe seu nome");
    expect(validatePersonName("   ")).toBe("Informe seu nome");
  });

  it("recusa nome acima de 50 caracteres", () => {
    expect(validatePersonName("a".repeat(NAME_MAX_LENGTH))).toBeNull();
    expect(validatePersonName("a".repeat(NAME_MAX_LENGTH + 1))).toBe("Nome inválido");
  });

  it("recusa dígitos e símbolos", () => {
    expect(validatePersonName("Lucas123")).toBe("Nome inválido");
    expect(validatePersonName("Lucas@Rocha")).toBe("Nome inválido");
  });

  it("aceita acentos e apóstrofo", () => {
    expect(validatePersonName("José D'Ávila")).toBeNull();
    expect(validatePersonName("Ângela Muñoz")).toBeNull();
  });

  it("ignora espaços nas pontas", () => {
    expect(validatePersonName("  Lucas Rocha  ")).toBeNull();
    expect(validatePersonName("   ")).toBe("Informe seu nome");
  });
});
