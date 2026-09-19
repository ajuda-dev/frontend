import { useCallback, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { NotificationProvider } from "../../context/NotificationContext";
import { useAuth } from "../../context/useAuth";
import { USER_ROLE_LABEL } from "../../utils/labels";
import { EmailVerificationBanner } from "../auth/EmailVerificationBanner";
import { Button } from "../ui/Button";
import { NotificationBell } from "./NotificationBell";
import { visibleNavItems } from "./navItems";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fullBleed = useLocation().pathname === "/agenda";
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const handleBellOpenChange = useCallback((open: boolean) => {
    if (open) setMenuOpen(false);
    setBellOpen(open);
  }, []);

  const items = visibleNavItems(user?.role);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <NotificationProvider>
      <div className={`bg-bg text-ink flex flex-col ${fullBleed ? "h-svh overflow-hidden" : "min-h-svh"}`}>
      <header className="bg-surface border-line sticky top-0 z-40 border-b">
        <div
          className={`mx-auto flex w-full items-center justify-between gap-4 px-4 py-3 ${fullBleed ? "" : "max-w-5xl"}`}
        >
          <Link to="/" className="font-mono text-brand text-lg" onClick={() => setNavOpen(false)}>
            &lt;AJUDA-DEV/&gt;
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
            <NotificationBell open={bellOpen} onOpenChange={handleBellOpenChange} />
            <div className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => {
                  setBellOpen(false);
                  setMenuOpen((open) => !open);
                }}
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

      {user && !user.emailVerified ? <EmailVerificationBanner /> : null}

      <main
        className={
          fullBleed
            ? "flex min-h-0 flex-1 flex-col px-3 py-3"
            : "mx-auto w-full max-w-5xl flex-1 px-4 py-6"
        }
      >
        <Outlet />
      </main>
    </div>
    </NotificationProvider>
  );
}
