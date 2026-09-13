import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useParticipants } from "../../hooks/useParticipants";
import type { EventItem, EventUser } from "../../types/api";
import { ParticipationZone } from "./ParticipationZone";

vi.mock("../../services/eventUser", () => ({
  joinEvent: vi.fn(),
  cancelParticipation: vi.fn(),
  getParticipants: vi.fn(),
  addParticipant: vi.fn(),
  updateParticipantStatus: vi.fn(),
}));

import {
  cancelParticipation,
  getParticipants,
  joinEvent,
  updateParticipantStatus,
} from "../../services/eventUser";

const mockedGet = vi.mocked(getParticipants);
const mockedJoin = vi.mocked(joinEvent);
const mockedCancel = vi.mocked(cancelParticipation);
const mockedUpdate = vi.mocked(updateParticipantStatus);

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
    ...overrides,
  };
}

function row(overrides: Partial<EventUser> = {}): EventUser {
  return {
    id: "p1",
    event_id: "e1",
    user_id: "u1",
    role: "ATTENDEE",
    status: "CONFIRMED",
    ...overrides,
  };
}

function Harness({ eventItem, userId = "u1" }: { eventItem: EventItem; userId?: string }) {
  const participation = useParticipants(eventItem.id, userId);
  return <ParticipationZone event={eventItem} participation={participation} />;
}

describe("ParticipationZone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGet.mockResolvedValue([]);
  });

  it("sem inscrição mostra Participar e o clique inscreve", async () => {
    mockedGet.mockResolvedValueOnce([]).mockResolvedValueOnce([row({ user_id: "u1" })]);
    mockedJoin.mockResolvedValue(row({ user_id: "u1" }));
    const user = userEvent.setup();
    render(<Harness eventItem={event()} />);

    await user.click(await screen.findByRole("button", { name: "Participar" }));

    expect(mockedJoin).toHaveBeenCalledWith("e1", "u1");
    expect(await screen.findByText("Você participa")).toBeInTheDocument();
  });

  it("vagas preenchidas desabilitam o botão e mostram a contagem", async () => {
    mockedGet.mockResolvedValue([row({ id: "p2", user_id: "u2" })]);
    render(<Harness eventItem={event({ max_slots: 1 })} />);

    expect(await screen.findByRole("button", { name: "Evento cheio" })).toBeDisabled();
    expect(screen.getByText("1 de 1 vagas ocupadas")).toBeInTheDocument();
  });

  it("participante confirmado cancela a inscrição e volta ao estado inicial", async () => {
    mockedGet
      .mockResolvedValueOnce([row({ user_id: "u1" })])
      .mockResolvedValueOnce([row({ user_id: "u1", status: "CANCELLED" })]);
    mockedCancel.mockResolvedValue(row({ user_id: "u1", status: "CANCELLED" }));
    const user = userEvent.setup();
    render(<Harness eventItem={event()} />);

    await user.click(await screen.findByRole("button", { name: "Cancelar inscrição" }));

    expect(mockedCancel).toHaveBeenCalledWith("e1", "u1");
    expect(await screen.findByText(/cancelada/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Participar" })).toBeInTheDocument();
  });

  it("mentoria sem convite não oferece inscrição", async () => {
    mockedGet.mockResolvedValue([row({ user_id: "u2", role: "MENTOR" })]);
    render(<Harness eventItem={event({ category: "MENTORING", max_slots: 2 })} />);

    expect(await screen.findByText(/Mentoria por convite/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Participar" })).not.toBeInTheDocument();
  });

  it("convite de mentoria pendente pode ser aceito", async () => {
    mockedGet
      .mockResolvedValueOnce([row({ user_id: "u1", role: "MENTEE", status: "REQUESTED" })])
      .mockResolvedValueOnce([row({ user_id: "u1", role: "MENTEE" })]);
    mockedUpdate.mockResolvedValue(row({ user_id: "u1", role: "MENTEE" }));
    const user = userEvent.setup();
    render(<Harness eventItem={event({ category: "MENTORING", max_slots: 2 })} />);

    await user.click(await screen.findByRole("button", { name: "Aceitar convite" }));

    expect(mockedUpdate).toHaveBeenCalledWith("e1", "u1", "CONFIRMED");
    expect(await screen.findByText("Você é o mentorado")).toBeInTheDocument();
  });

  it("convite de mentoria pendente pode ser recusado", async () => {
    mockedGet
      .mockResolvedValueOnce([row({ user_id: "u1", role: "MENTEE", status: "REQUESTED" })])
      .mockResolvedValueOnce([row({ user_id: "u1", role: "MENTEE", status: "REJECTED" })]);
    mockedUpdate.mockResolvedValue(row({ user_id: "u1", role: "MENTEE", status: "REJECTED" }));
    const user = userEvent.setup();
    render(<Harness eventItem={event({ category: "MENTORING", max_slots: 2 })} />);

    await user.click(await screen.findByRole("button", { name: "Recusar" }));

    expect(mockedUpdate).toHaveBeenCalledWith("e1", "u1", "REJECTED");
    expect(await screen.findByText("Você recusou o convite desta mentoria.")).toBeInTheDocument();
  });

  it("erro de ação aparece na zona com a mensagem traduzida", async () => {
    mockedGet.mockResolvedValue([]);
    mockedJoin.mockRejectedValue(apiError(400, "event is full"));
    const user = userEvent.setup();
    render(<Harness eventItem={event({ max_slots: 5 })} />);

    await user.click(await screen.findByRole("button", { name: "Participar" }));

    expect(await screen.findByText("O evento está cheio")).toBeInTheDocument();
  });

  it("erro no fetch mostra alerta com Tentar novamente", async () => {
    mockedGet
      .mockRejectedValueOnce(apiError(500, "internal server error"))
      .mockResolvedValueOnce([]);
    const user = userEvent.setup();
    render(<Harness eventItem={event()} />);

    await user.click(await screen.findByRole("button", { name: "Tentar novamente" }));

    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("button", { name: "Participar" })).toBeInTheDocument();
  });
});
