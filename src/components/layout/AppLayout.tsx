import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../../context/useAuth";
import { USER_ROLE_LABEL } from "../../utils/labels";
import { Button } from "../ui/Button";
import { visibleNavItems } from "./navItems";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const items = visibleNavItems(user?.role);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="bg-bg text-ink flex min-h-svh flex-col">
      <header className="bg-surface border-line sticky top-0 z-40 border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="font-mono text-brand text-lg" onClick={() => setNavOpen(false)}>
            &lt;AJUDA.DEV/&gt;
          </Link>

          <nav aria-label="Navegação principal" className="hidden items-center gap-1 sm:flex">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive ? "text-brand bg-surface-2" : "text-ink-muted hover:text-ink"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="border-line hover:bg-surface-2 flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
              >
                <span className="text-ink">{user?.name}</span>
                <span className="text-ink-muted text-xs">{user ? USER_ROLE_LABEL[user.role] : ""}</span>
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="bg-surface border-line absolute right-0 mt-2 w-44 rounded-md border p-1 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="text-ink hover:bg-surface-2 w-full rounded px-3 py-2 text-left text-sm"
                  >
                    Sair
                  </button>
                </div>
              ) : null}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="sm:hidden"
              aria-expanded={navOpen}
              aria-label="Abrir menu de navegação"
              onClick={() => setNavOpen((open) => !open)}
            >
              Menu
            </Button>
          </div>
        </div>

        {navOpen ? (
          <nav aria-label="Navegação principal" className="border-line border-t px-4 py-2 sm:hidden">
            {items.length === 0 ? (
              <p className="text-ink-muted py-2 text-sm">Nenhuma seção disponível ainda.</p>
            ) : (
              <ul className="flex flex-col">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={() => setNavOpen(false)}
                      className="text-ink-muted hover:text-ink block py-2 text-sm"
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
