import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useParticipants } from "../../hooks/useParticipants";
import type { EventItem, EventUser } from "../../types/api";
import { HostPanel } from "./HostPanel";

vi.mock("../../services/eventUser", () => ({
  joinEvent: vi.fn(),
  cancelParticipation: vi.fn(),
  getParticipants: vi.fn(),
  addParticipant: vi.fn(),
  updateParticipantStatus: vi.fn(),
}));

vi.mock("../../services/skill", () => ({ listSkills: vi.fn() }));
vi.mock("../../services/user", () => ({ listUsers: vi.fn() }));

import { addParticipant, cancelParticipation, getParticipants } from "../../services/eventUser";
import { listSkills } from "../../services/skill";
import { listUsers } from "../../services/user";

const mockedGet = vi.mocked(getParticipants);
const mockedCancel = vi.mocked(cancelParticipation);
const mockedAdd = vi.mocked(addParticipant);
const mockedSkills = vi.mocked(listSkills);
const mockedUsers = vi.mocked(listUsers);

function apiError(status: number, message = "erro") {
  return {
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    response: { status, data: { message, code: status } },
  };
}

function event(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: "e1",
    title: "Meetup Dev SP",
    description: "Encontro mensal",
    category: "COMMUNITY_EVENT",
    type: "ONLINE",
    start_at: "2026-10-01T18:00:00-03:00",
    duration_min: 60,
    owner: { id: "owner-1", name: "Ana", email: "ana@ajudadev.dev", role: "USER" },
    ...overrides,
  };
}

function row(overrides: Partial<EventUser> = {}): EventUser {
  const userId = overrides.user_id ?? "u1";
  return {
    id: `p-${userId}`,
    event_id: "e1",
    user_id: userId,
    role: "ATTENDEE",
    status: "CONFIRMED",
    user: {
      id: userId,
      name: `Pessoa ${userId}`,
      email: `${userId}@ajudadev.dev`,
      role: "USER",
    },
    ...overrides,
  };
}

function Harness({
  eventItem,
  viewerId = "owner-1",
  canManage = true,
}: {
  eventItem: EventItem;
  viewerId?: string;
  canManage?: boolean;
}) {
  const participation = useParticipants(eventItem.id, viewerId);
  return (
    <HostPanel
      event={eventItem}
      participation={participation}
      currentUserId={viewerId}
      canManage={canManage}
    />
  );
}

function renderPanel(eventItem: EventItem, viewerId = "owner-1", canManage = true) {
  return render(
    <MemoryRouter>
      <Harness eventItem={eventItem} viewerId={viewerId} canManage={canManage} />
    </MemoryRouter>,
  );
}

describe("HostPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGet.mockResolvedValue([]);
    mockedSkills.mockResolvedValue({ data: [], has_next: false });
    mockedUsers.mockResolvedValue({ data: [], has_next: false });
  });

  it("lista papéis e status e marca a própria linha sem ação", async () => {
    mockedGet.mockResolvedValue([
      row({ user_id: "owner-1", role: "MENTOR" }),
      row({ user_id: "u2", role: "MENTEE", status: "REQUESTED" }),
    ]);
    renderPanel(event({ category: "MENTORING", max_slots: 2 }));

    expect(await screen.findByText("Pessoa owner-1")).toBeInTheDocument();
    expect(screen.getByText("Pessoa u2")).toBeInTheDocument();
    expect(screen.getByText("Mentor")).toBeInTheDocument();
    expect(screen.getByText("Mentorado")).toBeInTheDocument();
    expect(screen.getByText("Pendente")).toBeInTheDocument();
    expect(screen.getByText("Você")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar convite" })).toBeInTheDocument();
  });

  it("exibe o comment do accept/reject na lista de participantes", async () => {
    mockedGet.mockResolvedValue([
      row({
        user_id: "u2",
        role: "MENTEE",
        status: "REJECTED",
        comment: "Agenda conflitou nesta semana",
      }),
    ]);
    renderPanel(event({ category: "MENTORING", max_slots: 2 }));

    expect(await screen.findByText("Agenda conflitou nesta semana")).toBeInTheDocument();
    expect(screen.getByText("Motivo da recusa")).toBeInTheDocument();
    expect(screen.getByText("Agenda conflitou nesta semana").closest("[role=status]")).toHaveClass(
      "border-danger",
    );
  });

  it("cancelar convite pendente chama DELETE e atualiza a lista", async () => {
    mockedGet
      .mockResolvedValueOnce([row({ user_id: "u2", role: "MENTEE", status: "REQUESTED" })])
      .mockResolvedValueOnce([row({ user_id: "u2", role: "MENTEE", status: "CANCELLED" })]);
    mockedCancel.mockResolvedValue(row({ user_id: "u2", role: "MENTEE", status: "CANCELLED" }));
    const user = userEvent.setup();
    renderPanel(event({ category: "MENTORING", max_slots: 2 }));

    await user.click(await screen.findByRole("button", { name: "Cancelar convite" }));

    expect(mockedCancel).toHaveBeenCalledWith("e1", "u2");
    expect(await screen.findByText("Cancelado")).toBeInTheDocument();
  });

  it("remover participante confirmado chama DELETE", async () => {
    mockedGet
      .mockResolvedValueOnce([row({ user_id: "u2" })])
      .mockResolvedValueOnce([row({ user_id: "u2", status: "CANCELLED" })]);
    mockedCancel.mockResolvedValue(row({ user_id: "u2", status: "CANCELLED" }));
    const user = userEvent.setup();
    renderPanel(event());

    await user.click(await screen.findByRole("button", { name: "Remover" }));

    expect(mockedCancel).toHaveBeenCalledWith("e1", "u2");
    expect(await screen.findByText("Cancelado")).toBeInTheDocument();
  });

  it("adicionar palestrante em evento comum envia SPEAKER e fecha o seletor", async () => {
    mockedGet.mockResolvedValue([]);
    mockedUsers.mockResolvedValue({
      data: [{ id: "u5", name: "Caio", skills: [] }],
      has_next: false,
    });
    mockedAdd.mockResolvedValue(row({ user_id: "u5", role: "SPEAKER" }));
    const user = userEvent.setup();
    renderPanel(event());

    await user.click(await screen.findByRole("button", { name: "Adicionar palestrante" }));
    await user.click(await screen.findByRole("radio", { name: "Caio" }));
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(mockedAdd).toHaveBeenCalledWith("e1", { userId: "u5", role: "SPEAKER" });
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Adicionar" })).not.toBeInTheDocument(),
    );
  });

  it("convidar mentorado em mentoria aberta envia MENTEE", async () => {
    mockedGet.mockResolvedValue([row({ user_id: "owner-1", role: "MENTOR" })]);
    mockedUsers.mockResolvedValue({
      data: [{ id: "u9", name: "Duda", skills: [] }],
      has_next: false,
    });
    mockedAdd.mockResolvedValue(row({ user_id: "u9", role: "MENTEE", status: "REQUESTED" }));
    const user = userEvent.setup();
    renderPanel(event({ category: "MENTORING", max_slots: 2 }));

    await user.click(await screen.findByRole("button", { name: "Convidar mentorado" }));
    await user.click(await screen.findByRole("radio", { name: "Duda" }));
    await user.click(screen.getByRole("button", { name: "Convidar" }));

    expect(mockedAdd).toHaveBeenCalledWith("e1", { userId: "u9", role: "MENTEE" });
  });

  it("mentoria criada por mentorado convida mentor", async () => {
    mockedGet.mockResolvedValue([row({ user_id: "owner-1", role: "MENTEE" })]);
    mockedUsers.mockResolvedValue({
      data: [{ id: "u9", name: "Duda", skills: [] }],
      has_next: false,
    });
    mockedAdd.mockResolvedValue(row({ user_id: "u9", role: "MENTOR", status: "REQUESTED" }));
    const user = userEvent.setup();
    renderPanel(event({ category: "MENTORING", max_slots: 2 }));

    expect(await screen.findByText(/Você é o mentorado desta mentoria/)).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "Convidar mentor" }));
    await user.click(await screen.findByRole("radio", { name: "Duda" }));
    await user.click(screen.getByRole("button", { name: "Convidar" }));

    expect(mockedAdd).toHaveBeenCalledWith("e1", { userId: "u9", role: "MENTOR" });
  });

  it("mentoria com mentorado confirmado bloqueia novo convite com aviso", async () => {
    mockedGet.mockResolvedValue([
      row({ user_id: "owner-1", role: "MENTOR" }),
      row({ user_id: "u2", role: "MENTEE" }),
    ]);
    renderPanel(event({ category: "MENTORING", max_slots: 2 }));

    expect(
      await screen.findByText("Mentoria já tem mentorado — não é possível convidar outro."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convidar mentorado" })).toBeDisabled();
  });

  it("mentoria criada por mentorado bloqueia convite quando o mentor já confirmou", async () => {
    mockedGet.mockResolvedValue([
      row({ user_id: "owner-1", role: "MENTEE" }),
      row({ user_id: "u2", role: "MENTOR" }),
    ]);
    renderPanel(event({ category: "MENTORING", max_slots: 2 }));

    expect(
      await screen.findByText("Mentoria já tem mentor — não é possível convidar outro."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convidar mentor" })).toBeDisabled();
  });

  it("erro ao adicionar mostra o alerta traduzido dentro do seletor", async () => {
    mockedGet.mockResolvedValue([]);
    mockedUsers.mockResolvedValue({
      data: [{ id: "u5", name: "Caio", skills: [] }],
      has_next: false,
    });
    mockedAdd.mockRejectedValue(apiError(400, "user is already invited to this event"));
    const user = userEvent.setup();
    renderPanel(event());

    await user.click(await screen.findByRole("button", { name: "Adicionar palestrante" }));
    await user.click(await screen.findByRole("radio", { name: "Caio" }));
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(
      await screen.findByText("Este usuário já tem convite pendente neste evento"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar" })).toBeInTheDocument();
  });

  it("sem participantes mostra estado vazio e a contagem de vagas", async () => {
    mockedGet.mockResolvedValue([]);
    renderPanel(event({ max_slots: 5 }));

    expect(await screen.findByText("Nenhum participante ainda.")).toBeInTheDocument();
    expect(screen.getByText(/0 de 5 vagas ocupadas/)).toBeInTheDocument();
  });

  it("quem gerencia sem ser criador vê o título de gestão e o subtítulo explicativo", async () => {
    mockedGet.mockResolvedValue([]);
    renderPanel(event(), "dono-c1");

    expect(await screen.findByText("Gestão do evento")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Você gerencia este evento como responsável pela comunidade ou pela moderação.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Painel do anfitrião")).not.toBeInTheDocument();
  });

  it("criador de 1:1 não pode ser removido: a linha dele mostra o badge e nenhuma ação", async () => {
    mockedGet.mockResolvedValue([
      row({ user_id: "owner-1", role: "MENTOR" }),
      row({ user_id: "u2", role: "MENTEE" }),
    ]);
    renderPanel(event({ category: "MENTORING", max_slots: 2 }), "dono-c1");

    expect(await screen.findByText("Criador do 1:1")).toBeInTheDocument();
    // Só a linha do mentorado (u2) tem ação; a do criador não.
    expect(screen.getAllByRole("button", { name: "Remover" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Cancelar convite" })).not.toBeInTheDocument();
  });

  it("em evento comum o criador continua removível por quem gerencia", async () => {
    mockedGet
      .mockResolvedValueOnce([row({ user_id: "owner-1" })])
      .mockResolvedValueOnce([row({ user_id: "owner-1", status: "CANCELLED" })]);
    mockedCancel.mockResolvedValue(row({ user_id: "owner-1", status: "CANCELLED" }));
    const user = userEvent.setup();
    renderPanel(event(), "dono-c1");

    await user.click(await screen.findByRole("button", { name: "Remover" }));

    expect(mockedCancel).toHaveBeenCalledWith("e1", "owner-1");
    expect(await screen.findByText("Cancelado")).toBeInTheDocument();
  });

  it("convidado do 1:1 vê a mesma lista sem ações de gestão", async () => {
    mockedGet.mockResolvedValue([
      row({ user_id: "owner-1", role: "MENTOR", user: { id: "owner-1", name: "João Silva", email: "joao@ajudadev.dev", role: "USER" } }),
      row({
        user_id: "u2",
        role: "MENTEE",
        status: "REQUESTED",
        user: { id: "u2", name: "Lucas Freitas da Rocha", email: "lucas@ajudadev.dev", role: "USER" },
      }),
    ]);
    renderPanel(event({ category: "MENTORING", max_slots: 2 }), "u2", false);

    expect(await screen.findByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("Participantes")).toBeInTheDocument();
    expect(screen.getByText("Lucas Freitas da Rocha")).toBeInTheDocument();
    expect(screen.getByText("Mentor")).toBeInTheDocument();
    expect(screen.getByText("Mentorado")).toBeInTheDocument();
    expect(screen.getByText("Pendente")).toBeInTheDocument();
    expect(screen.getByText("Criador do 1:1")).toBeInTheDocument();
    expect(screen.getByText("Você")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aceitar convite" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Recusar" })).not.toBeInTheDocument();
    expect(screen.queryByText("Painel do anfitrião")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Convidar mentorado" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar convite" })).not.toBeInTheDocument();
  });

  it("convidado pendente não vê Aceitar/Recusar na lista — só o badge Você", async () => {
    mockedGet.mockResolvedValue([
      row({ user_id: "owner-1", role: "MENTOR" }),
      row({ user_id: "u2", role: "MENTEE", status: "REQUESTED" }),
    ]);
    renderPanel(event({ category: "MENTORING", max_slots: 2 }), "u2", false);

    expect(await screen.findByText("Você")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aceitar convite" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Recusar" })).not.toBeInTheDocument();
  });
});
