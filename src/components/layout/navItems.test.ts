import { describe, expect, it } from "vitest";
import { NAV_ITEMS, visibleNavItems } from "./navItems";

describe("visibleNavItems", () => {
  it("mostra os itens Comunidades, Eventos, Agenda, Pessoas e Meu perfil", () => {
    expect(visibleNavItems("USER").map((item) => item.label)).toEqual([
      "Comunidades",
      "Eventos",
      "Agenda",
      "Pessoas",
      "Meu perfil",
    ]);
  });

  it("não guarda item desabilitado: todas as rotas do menu existem", () => {
    expect(NAV_ITEMS.filter((item) => !item.enabled)).toEqual([]);
  });

  it("mostra item habilitado sem restrição de cargo", () => {
    const visible = NAV_ITEMS.filter((item) => item.enabled && !item.roles);
    expect(visible.map((item) => item.label)).toEqual([
      "Comunidades",
      "Eventos",
      "Agenda",
      "Pessoas",
      "Meu perfil",
    ]);
  });

  it("esconde item restrito a ADMIN para USER", () => {
    const adminOnly = { to: "/admin", label: "Admin", roles: ["ADMIN" as const], enabled: true };
    expect(adminOnly.roles.includes("USER" as never)).toBe(false);
    expect(adminOnly.roles.includes("ADMIN")).toBe(true);
  });
});
