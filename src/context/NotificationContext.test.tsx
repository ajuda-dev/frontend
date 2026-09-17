import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Notification } from "../types/api";
import { AuthProvider } from "./AuthContext";
import { NotificationProvider } from "./NotificationContext";
import { useNotifications } from "./useNotifications";
import { listNotifications, markNotificationRead } from "../services/notification";
import { openNotificationStream } from "../services/notificationStream";
import type { NotificationStreamHandlers } from "../services/notificationStream";

vi.mock("../services/auth", () => ({
  login: vi.fn(),
  register: vi.fn(),
  me: vi.fn().mockResolvedValue({
    id: "u1",
    name: "Lucas Rocha",
    email: "lucas@ajudadev.dev",
    role: "USER",
    emailVerified: true,
  }),
  logout: vi.fn(),
}));

vi.mock("../services/notification", () => ({
  listNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
}));

vi.mock("../services/notificationStream", () => ({
  openNotificationStream: vi.fn(() => vi.fn()),
}));

const mockedList = vi.mocked(listNotifications);
const mockedMarkRead = vi.mocked(markNotificationRead);
const mockedOpen = vi.mocked(openNotificationStream);

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

function Probe() {
  const { items, markReadAndOpen } = useNotifications();
  const location = useLocation();
  return (
    <div>
      <p>path:{location.pathname}</p>
      <ul>
        {items.map((n) => (
          <li key={n.id}>
            <button type="button" onClick={() => markReadAndOpen(n)}>
              {n.id}:{n.payload.title ?? n.type}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function seedSession() {
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" }),
  );
}

function renderProvider() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/" element={<Probe />} />
            <Route path="/eventos/:id" element={<Probe />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("NotificationContext", () => {
  let handlers: NotificationStreamHandlers | undefined;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    handlers = undefined;
    mockedList.mockResolvedValue({ data: [], has_next: false });
    mockedMarkRead.mockResolvedValue(item(1, { read_at: "2026-09-14T13:00:00.000Z" }));
    mockedOpen.mockImplementation((next) => {
      handlers = next;
      return vi.fn();
    });
    seedSession();
  });

  it("carrega unread no boot e não duplica o mesmo id do SSE", async () => {
    mockedList.mockResolvedValue({ data: [item(42)], has_next: false });
    renderProvider();

    expect(await screen.findByText("42:Evento 42")).toBeInTheDocument();

    act(() => {
      handlers?.onNotification({
        id: 42,
        type: "COMMUNITY_EVENT_PENDING_APPROVAL",
        payload: { event_id: "e42", title: "Evento 42" },
      });
    });

    expect(screen.getAllByText("42:Evento 42")).toHaveLength(1);
  });

  it("ignora tipo desconhecido no stream", async () => {
    renderProvider();
    await waitFor(() => expect(mockedOpen).toHaveBeenCalled());

    act(() => {
      handlers?.onNotification({
        id: 9,
        type: "PASSWORD_RESET",
        payload: { event_id: "e9" },
      });
    });

    expect(screen.queryByText(/PASSWORD_RESET/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("inclui aceite e recusa vindos do stream", async () => {
    renderProvider();
    await waitFor(() => expect(mockedOpen).toHaveBeenCalled());

    act(() => {
      handlers?.onNotification({
        id: 8,
        type: "COMMUNITY_EVENT_APPROVED",
        payload: { event_id: "e8", title: "Meetup" },
      });
    });

    expect(await screen.findByRole("button", { name: "8:Meetup" })).toBeInTheDocument();
  });

  it("marca lida de forma otimista, chama PUT e navega", async () => {
    const user = userEvent.setup();
    mockedList.mockResolvedValue({ data: [item(42)], has_next: false });
    renderProvider();

    await user.click(await screen.findByRole("button", { name: "42:Evento 42" }));

    expect(mockedMarkRead).toHaveBeenCalledWith(42);
    expect(screen.getByText("path:/eventos/e42")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "42:Evento 42" })).not.toBeInTheDocument();
  });

  it("recoloca o item se o PUT falhar por rede", async () => {
    const user = userEvent.setup();
    mockedList.mockResolvedValue({ data: [item(7)], has_next: false });
    mockedMarkRead.mockRejectedValue(new Error("offline"));
    renderProvider();

    await user.click(await screen.findByRole("button", { name: "7:Evento 7" }));

    expect(await screen.findByRole("button", { name: "7:Evento 7" })).toBeInTheDocument();
  });
});
