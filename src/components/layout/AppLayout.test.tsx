import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import { AppLayout } from "./AppLayout";
import { NAV_ITEMS } from "./navItems";

vi.mock("../../services/notification", () => ({
  listNotifications: vi.fn().mockResolvedValue({ data: [], has_next: false }),
  markNotificationRead: vi.fn(),
}));

vi.mock("../../services/notificationStream", () => ({
  openNotificationStream: vi.fn(() => vi.fn()),
}));

function seedSession(role: "USER" | "ADMIN" = "USER") {
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role }),
  );
}

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<p>Conteúdo</p>} />
          </Route>
          <Route path="/login" element={<p>Tela de login</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("AppLayout", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("mostra nome e cargo do usuário logado", () => {
    seedSession();
    renderLayout();
    expect(screen.getByText("Lucas Rocha")).toBeInTheDocument();
    expect(screen.getByText("Usuário")).toBeInTheDocument();
  });

  it("mostra o sino de notificações", () => {
    seedSession();
    renderLayout();
    expect(screen.getByRole("button", { name: /Notificações/ })).toBeInTheDocument();
  });

  it("Sair encerra a sessão e vai para o login", async () => {
    const user = userEvent.setup();
    seedSession();
    renderLayout();

    await user.click(screen.getByRole("button", { name: /Lucas Rocha/ }));
    await user.click(screen.getByRole("menuitem", { name: "Sair" }));

    expect(await screen.findByText("Tela de login")).toBeInTheDocument();
    expect(localStorage.getItem("ajudadev.user")).toBeNull();
  });

  it("renderiza o conteúdo da rota filha", () => {
    seedSession();
    renderLayout();
    expect(screen.getByText("Conteúdo")).toBeInTheDocument();
  });

  it("mostra o item de nav habilitado (Comunidades)", () => {
    seedSession();
    renderLayout();
    expect(screen.getByRole("link", { name: "Comunidades" })).toBeInTheDocument();
  });

  it("mostra o item de nav Eventos habilitado pelo plano 06", () => {
    seedSession();
    renderLayout();
    expect(screen.getByRole("link", { name: "Eventos" })).toBeInTheDocument();
  });

  it("não exibe itens de nav desabilitados (rotas ainda inexistentes)", () => {
    seedSession();
    renderLayout();
    for (const item of NAV_ITEMS.filter((navItem) => !navItem.enabled)) {
      expect(screen.queryByRole("link", { name: item.label })).not.toBeInTheDocument();
    }
  });
});
