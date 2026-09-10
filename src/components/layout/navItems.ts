import type { UserRole } from "../../types/api";

export interface NavItem {
  to: string;
  label: string;
  roles?: UserRole[];
  // Ligado pelo plano que cria a página: evita link morto entre planos.
  enabled: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/comunidades", label: "Comunidades", enabled: true },
  { to: "/eventos", label: "Eventos", enabled: false },
  { to: "/skills", label: "Skills", enabled: false },
  { to: "/pessoas", label: "Pessoas", enabled: false },
  { to: "/perfil", label: "Meu perfil", enabled: false },
];

export function visibleNavItems(role: UserRole | null | undefined): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (!item.enabled) return false;
    if (!item.roles) return true;
    return role ? item.roles.includes(role) : false;
  });
}
