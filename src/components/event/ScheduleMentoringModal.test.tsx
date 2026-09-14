import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventItem } from "../../types/api";
import { ScheduleMentoringModal } from "./ScheduleMentoringModal";

vi.mock("../../services/event", () => ({ createEvent: vi.fn() }));
vi.mock("../../services/eventUser", () => ({ addParticipant: vi.fn() }));

import { createEvent } from "../../services/event";
import { addParticipant } from "../../services/eventUser";

const mockedCreateEvent = vi.mocked(createEvent);
const mockedAdd = vi.mocked(addParticipant);

const CREATED: EventItem = {
  id: "e1",
  title: "Mentoria 1:1 com Ana Souza",
  description: "",
  category: "MENTORING",
  type: "ONLINE",
  start_at: "2026-10-01T21:00:00.000Z",
  duration_min: 60,
};

function apiError(status: number, message: string) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: { message, code: status } },
  });
}

// Data futura em hora local, no formato aceito pelo input datetime-local.
function futureLocalValue(): string {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

const onClose = vi.fn();
const onScheduled = vi.fn();

function renderModal() {
  return render(
    <ScheduleMentoringModal
      person={{ id: "u2", name: "Ana Souza" }}
      onClose={onClose}
      onScheduled={onScheduled}
    />,
  );
}

// O `datetime-local` entra em um único change (digitar caractere a caractere fica
// instável sob carga, porque o input só aceita a data quando ela vira válida).
function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  fireEvent.change(screen.getByLabelText("Data e hora"), {
    target: { value: futureLocalValue() },
  });
  return user.click(screen.getByRole("button", { name: "Agendar 1:1" }));
}

describe("ScheduleMentoringModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateEvent.mockResolvedValue(CREATED);
    mockedAdd.mockResolvedValue({
      id: "p1",
      event_id: "e1",
      user_id: "u2",
      role: "MENTEE",
      status: "REQUESTED",
    });
  });

  it("cria o 1:1 como MENTORING online e convida a pessoa com o papel complementar", async () => {
    const user = userEvent.setup();
    renderModal();

    expect(screen.getByLabelText("Título")).toHaveValue("Mentoria 1:1 com Ana Souza");
    expect(screen.getByText(/convida Ana Souza como mentorado/)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Mensagem"), "Vamos falar sobre Go");
    await fillAndSubmit(user);

    await waitFor(() => expect(onScheduled).toHaveBeenCalledWith("e1"));
    expect(mockedCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Mentoria 1:1 com Ana Souza",
        description: "Vamos falar sobre Go",
        category: "MENTORING",
        type: "ONLINE",
        duration_min: 60,
        creator_role: "MENTOR",
        start_at: new Date(futureLocalValue()).toISOString(),
      }),
    );
    expect(mockedAdd).toHaveBeenCalledWith("e1", { userId: "u2", role: "MENTEE" });
    expect(mockedCreateEvent.mock.invocationCallOrder[0]).toBeLessThan(
      mockedAdd.mock.invocationCallOrder[0],
    );
  });

  it("quem se marca como mentorado convida a pessoa como mentor", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.selectOptions(screen.getByLabelText("Meu papel nesta mentoria"), "MENTEE");
    expect(screen.getByText(/convida Ana Souza como mentor\b/)).toBeInTheDocument();

    await fillAndSubmit(user);

    await waitFor(() => expect(onScheduled).toHaveBeenCalledWith("e1"));
    expect(mockedCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({ creator_role: "MENTEE" }),
    );
    expect(mockedAdd).toHaveBeenCalledWith("e1", { userId: "u2", role: "MENTOR" });
  });

  it("sem data e hora nada é enviado para a API", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "Agendar 1:1" }));

    expect(await screen.findByText("Informe a data e a hora do 1:1")).toBeInTheDocument();
    expect(mockedCreateEvent).not.toHaveBeenCalled();
    expect(mockedAdd).not.toHaveBeenCalled();
  });

  it("data no passado é barrada localmente", async () => {
    const user = userEvent.setup();
    renderModal();

    fireEvent.change(screen.getByLabelText("Data e hora"), {
      target: { value: "2020-01-01T10:00" },
    });
    await user.click(screen.getByRole("button", { name: "Agendar 1:1" }));

    expect(await screen.findByText("A data precisa ser no futuro")).toBeInTheDocument();
    expect(mockedCreateEvent).not.toHaveBeenCalled();
  });

  it("erro ao criar o 1:1 mostra a mensagem traduzida e não convida", async () => {
    mockedCreateEvent.mockRejectedValue(apiError(400, "invalid event data"));
    const user = userEvent.setup();
    renderModal();

    await fillAndSubmit(user);

    expect(await screen.findByText("Dados do evento inválidos")).toBeInTheDocument();
    expect(mockedAdd).not.toHaveBeenCalled();
    expect(onScheduled).not.toHaveBeenCalled();
  });

  it("convite que falha mantém o 1:1 criado e leva até ele", async () => {
    mockedAdd.mockRejectedValue(apiError(500, "internal server error"));
    const user = userEvent.setup();
    renderModal();

    await fillAndSubmit(user);

    const alert = await screen.findByRole("alert");
    expect(
      within(alert).getByText("O 1:1 foi criado, mas o convite para Ana Souza não foi enviado"),
    ).toBeInTheDocument();
    expect(within(alert).getByText("Erro interno no servidor")).toBeInTheDocument();
    expect(within(alert).getByText(/Você pode convidar Ana Souza na página do 1:1/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agendar 1:1" })).not.toBeInTheDocument();
    expect(onScheduled).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Ir para o 1:1" }));
    expect(onScheduled).toHaveBeenCalledWith("e1");
  });
});
