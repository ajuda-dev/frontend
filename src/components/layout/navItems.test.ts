import { describe, expect, it } from "vitest";
import { NAV_ITEMS, visibleNavItems } from "./navItems";

describe("visibleNavItems", () => {
  it("mostra o item Comunidades habilitado pelo plano 04", () => {
    expect(visibleNavItems("USER").map((item) => item.label)).toEqual(["Comunidades"]);
  });

  it("esconde itens desabilitados (rota ainda não existe)", () => {
    const disabled = NAV_ITEMS.filter((item) => !item.enabled);
    expect(disabled.map((item) => item.label)).toEqual([
      "Eventos",
      "Skills",
      "Pessoas",
      "Meu perfil",
    ]);
  });

  it("mostra item habilitado sem restrição de cargo", () => {
    const items = NAV_ITEMS.map((item) =>
      item.to === "/comunidades" ? { ...item, enabled: true } : item,
    );
    const visible = items.filter((item) => item.enabled && !item.roles);
    expect(visible.map((item) => item.label)).toEqual(["Comunidades"]);
  });

  it("esconde item restrito a ADMIN para USER", () => {
    const adminOnly = { to: "/admin", label: "Admin", roles: ["ADMIN" as const], enabled: true };
    expect(adminOnly.roles.includes("USER" as never)).toBe(false);
    expect(adminOnly.roles.includes("ADMIN")).toBe(true);
  });
});
