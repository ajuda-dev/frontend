import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Notification } from "../../types/api";
import type { NotificationContextValue } from "../../context/useNotifications";
import { NotificationBell } from "./NotificationBell";

const markReadAndOpen = vi.fn();
const retry = vi.fn();
const loadMore = vi.fn();

const notificationsState: NotificationContextValue = {
  items: [],
  unreadLabel: "",
  hasNext: false,
  loading: false,
  error: null,
  loadMore,
  retry,
  markReadAndOpen,
  streamReady: true,
};

vi.mock("../../context/useNotifications", () => ({
  useNotifications: () => notificationsState,
}));

function item(id: number, overrides: Partial<Notification> = {}): Notification {
  return {
    id,
    type: "COMMUNITY_EVENT_PENDING_APPROVAL",
    payload: { event_id: `e${id}`, title: `Evento ${id}` },
    created_at: "2026-09-14T12:00:00.000Z",
    read_at: null,
    ...overrides,
  };
}

function BellHarness({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return <NotificationBell open={open} onOpenChange={setOpen} />;
}

function renderBell(initialOpen = false) {
  return render(
    <MemoryRouter>
      <BellHarness initialOpen={initialOpen} />
    </MemoryRouter>,
  );
}

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationsState.items = [];
    notificationsState.unreadLabel = "";
    notificationsState.hasNext = false;
    notificationsState.loading = false;
    notificationsState.error = null;
  });

  it("não mostra badge com lista vazia", () => {
    renderBell();
    expect(screen.getByRole("button", { name: "Notificações, nenhuma não lida" })).toBeInTheDocument();
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("mostra 1 no badge", () => {
    notificationsState.items = [item(1)];
    notificationsState.unreadLabel = "1";
    renderBell();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("mostra 10+ quando há próxima página", () => {
    notificationsState.items = Array.from({ length: 10 }, (_, index) => item(index + 1));
    notificationsState.unreadLabel = "10+";
    notificationsState.hasNext = true;
    renderBell();
    expect(screen.getByText("10+")).toBeInTheDocument();
  });

  it("mostra estado vazio no painel", async () => {
    const user = userEvent.setup();
    renderBell();
    await user.click(screen.getByRole("button", { name: "Notificações, nenhuma não lida" }));
    expect(await screen.findByText("Nenhuma notificação por agora.")).toBeInTheDocument();
  });

  it("clique no item marca e navega via contexto", async () => {
    const user = userEvent.setup();
    const listed = item(42);
    notificationsState.items = [listed];
    notificationsState.unreadLabel = "1";
    renderBell(true);

    await user.click(screen.getByRole("button", { name: /Evento 42 aguarda a sua aprovação/ }));

    expect(markReadAndOpen).toHaveBeenCalledWith(listed);
  });

  it("Esc fecha o painel", async () => {
    const user = userEvent.setup();
    renderBell(true);
    expect(screen.getByRole("dialog", { name: "Notificações" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Notificações" })).not.toBeInTheDocument();
  });

  it("pinta reagendamento de 1:1 de amarelo e recusa de vermelho", () => {
    notificationsState.items = [
      item(1, {
        type: "MENTORING_INVITE_RESCHEDULED",
        payload: { event_id: "e1", title: "Mentoria Go", category: "MENTORING" },
      }),
      item(2, {
        type: "MENTORING_INVITE_REJECTED",
        payload: { event_id: "e2", title: "Mentoria Go", category: "MENTORING" },
      }),
    ];
    renderBell(true);

    expect(screen.getByText("Mentoria reagendada")).toHaveClass("text-warning");
    expect(screen.getByRole("button", { name: /A mentoria Mentoria Go foi reagendada/ })).toHaveClass(
      "border-warning",
    );
    expect(screen.getByText("Convite recusado")).toHaveClass("text-danger");
    expect(screen.getByRole("button", { name: /O convite de mentoria Mentoria Go foi recusado/ })).toHaveClass(
      "border-danger",
    );
  });
});
