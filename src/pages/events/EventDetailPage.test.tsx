import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import type { EventItem } from "../../types/api";
import { EventDetailPage } from "./EventDetailPage";

vi.mock("../../services/event", () => ({
  findEventById: vi.fn(),
  listEvents: vi.fn(),
  createEvent: vi.fn(),
  deleteEvent: vi.fn(),
  approveEvent: vi.fn(),
  rescheduleEvent: vi.fn(),
}));

vi.mock("../../services/eventUser", () => ({
  joinEvent: vi.fn(),
  cancelParticipation: vi.fn(),
  getParticipants: vi.fn(),
  addParticipant: vi.fn(),
  updateParticipantStatus: vi.fn(),
}));

import { deleteEvent, findEventById, approveEvent, rescheduleEvent } from "../../services/event";
import { getParticipants, joinEvent, updateParticipantStatus } from "../../services/eventUser";

const mockedFind = vi.mocked(findEventById);
const mockedDelete = vi.mocked(deleteEvent);
const mockedApprove = vi.mocked(approveEvent);
const mockedReschedule = vi.mocked(rescheduleEvent);
const mockedParticipants = vi.mocked(getParticipants);
const mockedJoinEvent = vi.mocked(joinEvent);
const mockedUpdateStatus = vi.mocked(updateParticipantStatus);

const EVENT: EventItem = {
  id: "e1",
  title: "Meetup Dev SP",
  description: "Encontro mensal da comunidade",
  category: "COMMUNITY_EVENT",
  type: "INPERSON",
  start_at: "2026-10-01T18:00:00-03:00",
  duration_min: 90,
  address: { id: "a1", zip_code: "01001000", city: "São Paulo", state: "SP" },
  owner: { id: "owner-1", name: "Ana", email: "ana@ajudadev.dev", role: "USER" },
  community: { id: "c1", name: "Dev SP", description: "Comunidade de São Paulo" },
};

function seedSession(id = "u1", emailVerified = true) {
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({
      id,
      name: "Lucas Rocha",
      email: "lucas@ajudadev.dev",
      role: "USER",
      emailVerified,
    }),
  );
}

function renderDetail(state?: { event: EventItem }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/eventos/e1", state }]}>
      <AuthProvider>
        <Routes>
          <Route path="/eventos/:id" element={<EventDetailPage />} />
          <Route path="/eventos" element={<p>Lista de eventos</p>} />
          <Route path="/comunidades/:id" element={<p>Detalhe da comunidade</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

// Data futura em hora local, no formato aceito pelo input datetime-local.
function futureLocalValue(): string {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

describe("EventDetailPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // clearAllMocks não esvazia filas de mockResolvedValueOnce; reseta os que usam once.
    mockedFind.mockReset();
    mockedParticipants.mockReset();
    mockedParticipants.mockResolvedValue([]);
    seedSession();
  });

  it("com state da lista mostra na hora e confirma no GET", async () => {
    mockedFind.mockResolvedValue({ ...EVENT, comment: "teste" });
    renderDetail({ event: { ...EVENT, comment: "vamos deixar para semana que vem" } });

    expect(
      await screen.findByText("vamos deixar para semana que vem"),
    ).toBeInTheDocument();
    expect(await screen.findByText("teste")).toBeInTheDocument();
    expect(screen.queryByText("vamos deixar para semana que vem")).not.toBeInTheDocument();
    expect(mockedFind).toHaveBeenCalledWith("e1", expect.anything());
  });

  it("sem state busca pelo id (acesso direto/refresh)", async () => {
    mockedFind.mockResolvedValue(EVENT);
    renderDetail();

    expect(await screen.findByRole("heading", { name: "Meetup Dev SP" })).toBeInTheDocument();
    expect(mockedFind).toHaveBeenCalledWith("e1", expect.anything());
  });

  it("state de outro evento é ignorado", async () => {
    mockedFind.mockResolvedValue(EVENT);
    renderDetail({ event: { ...EVENT, id: "e9" } });

    expect(await screen.findByRole("heading", { name: "Meetup Dev SP" })).toBeInTheDocument();
    expect(mockedFind).toHaveBeenCalledWith("e1", expect.anything());
  });

  it("não encontrado mostra estado amigável com volta para a lista", async () => {
    mockedFind.mockResolvedValue(null);
    renderDetail();

    expect(await screen.findByText("Evento não encontrado ou removido.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para a lista" })).toHaveAttribute(
      "href",
      "/eventos",
    );
  });

  it("erro mostra Alert com Tentar novamente", async () => {
    mockedFind.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(EVENT);
    renderDetail();

    expect(await screen.findByText("Não foi possível carregar o evento")).toBeInTheDocument();
  });

  it("mostra data, duração, endereço e owner", async () => {
    renderDetail({ event: EVENT });

    await screen.findByRole("heading", { name: "Meetup Dev SP" });
    expect(screen.getAllByText("01/10/2026, 18:00").length).toBeGreaterThan(0);
    expect(screen.getByText("90 min")).toBeInTheDocument();
    expect(screen.getByText("São Paulo/SP")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("evento com community mostra o link com state", async () => {
    renderDetail({ event: EVENT });

    const link = await screen.findByRole("link", { name: "Comunidade: Dev SP" });
    expect(link).toHaveAttribute("href", "/comunidades/c1");
  });

  it("owner vê o badge Você organiza", async () => {
    seedSession("owner-1");
    renderDetail({ event: EVENT });

    expect(await screen.findByText("Você organiza")).toBeInTheDocument();
  });

  it("não-owner não vê o badge Você organiza", async () => {
    renderDetail({ event: EVENT });

    await screen.findByRole("heading", { name: "Meetup Dev SP" });
    expect(screen.queryByText("Você organiza")).not.toBeInTheDocument();
  });

  it("online com meeting_link mostra o link em nova aba", async () => {
    renderDetail({
      event: { ...EVENT, type: "ONLINE", address: null, meeting_link: "https://meet.example.com/x" },
    });

    const link = await screen.findByRole("link", { name: "Acessar link da reunião" });
    expect(link).toHaveAttribute("href", "https://meet.example.com/x");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("online sem meeting_link avisa que o link será divulgado", async () => {
    renderDetail({ event: { ...EVENT, type: "ONLINE", address: null } });

    expect(await screen.findByText("Evento online — link será divulgado.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Acessar link da reunião" })).not.toBeInTheDocument();
  });

  it("não-owner sem cargo não vê o botão de excluir", async () => {
    renderDetail({ event: EVENT });

    await screen.findByRole("heading", { name: "Meetup Dev SP" });
    expect(screen.queryByRole("button", { name: "Excluir evento" })).not.toBeInTheDocument();
  });

  it("owner vê o botão e a confirmação exclui e navega para a lista", async () => {
    seedSession("owner-1");
    mockedDelete.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderDetail({ event: EVENT });

    await user.click(await screen.findByRole("button", { name: "Excluir evento" }));
    expect(screen.getByText("Excluir evento? Esta ação não pode ser desfeita.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByText("Informe o motivo do cancelamento")).toBeInTheDocument();
    expect(mockedDelete).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Motivo do cancelamento"), "Mudança de data");
    await user.click(screen.getByRole("button", { name: "Excluir" }));

    expect(await screen.findByText("Lista de eventos")).toBeInTheDocument();
    expect(mockedDelete).toHaveBeenCalledWith("e1", "Mudança de data");
  });

  it("moderador excluindo evento alheio vê confirmação reforçada", async () => {
    localStorage.setItem(
      "ajudadev.user",
      JSON.stringify({
        id: "u9",
        name: "Mod",
        email: "mod@ajudadev.dev",
        role: "MODERATOR",
      }),
    );
    const user = userEvent.setup();
    renderDetail({ event: EVENT });

    await user.click(await screen.findByRole("button", { name: "Excluir evento" }));

    expect(
      screen.getByText(
        "Você está excluindo um evento que não é seu (você gerencia a comunidade ou a moderação). Esta ação não pode ser desfeita.",
      ),
    ).toBeInTheDocument();
  });

  it("404 no delete é tratado como já excluído e navega", async () => {
    seedSession("owner-1");
    mockedDelete.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 404",
      response: { status: 404, data: { message: "event not found", code: 404 } },
    });
    const user = userEvent.setup();
    renderDetail({ event: EVENT });

    await user.click(await screen.findByRole("button", { name: "Excluir evento" }));
    await user.type(screen.getByLabelText("Motivo do cancelamento"), "Já removido");
    await user.click(screen.getByRole("button", { name: "Excluir" }));

    expect(await screen.findByText("Lista de eventos")).toBeInTheDocument();
  });

  it("erro inesperado no delete mantém a tela com Alert", async () => {
    seedSession("owner-1");
    mockedDelete.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 500",
      response: { status: 500, data: { message: "internal server error", code: 500 } },
    });
    const user = userEvent.setup();
    renderDetail({ event: EVENT });

    await user.click(await screen.findByRole("button", { name: "Excluir evento" }));
    await user.type(screen.getByLabelText("Motivo do cancelamento"), "Falha esperada");
    await user.click(screen.getByRole("button", { name: "Excluir" }));

    expect(await screen.findByText("Erro interno no servidor")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Meetup Dev SP" })).toBeInTheDocument();
    expect(screen.queryByText("Lista de eventos")).not.toBeInTheDocument();
  });

  it("não-owner vê a zona de participação e não o painel do anfitrião", async () => {
    renderDetail({ event: EVENT });

    expect(await screen.findByRole("button", { name: "Participar" })).toBeInTheDocument();
    expect(screen.getByText("Sua participação")).toBeInTheDocument();
    expect(screen.queryByText("Painel do anfitrião")).not.toBeInTheDocument();
  });

  it("owner vê o painel do anfitrião com a lista e também a zona de participação", async () => {
    seedSession("owner-1");
    mockedParticipants.mockResolvedValue([
      {
        id: "p2",
        event_id: "e1",
        user_id: "u2",
        role: "ATTENDEE",
        status: "CONFIRMED",
        user: { id: "u2", name: "Bea", email: "bea@ajudadev.dev", role: "USER" },
      },
    ]);
    renderDetail({ event: EVENT });

    expect(await screen.findByText("Painel do anfitrião")).toBeInTheDocument();
    expect(await screen.findByText("Bea")).toBeInTheDocument();
    // O criador de evento comum também se inscreve: as duas seções convivem.
    expect(screen.getByText("Sua participação")).toBeInTheDocument();
  });

  it("mentorado aceita o convite na lista de participantes", async () => {
    const requestedRow = {
      id: "p2",
      event_id: "e1",
      user_id: "u1",
      role: "MENTEE" as const,
      status: "REQUESTED" as const,
      user: { id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" as const },
    };
    const ownerRow = {
      id: "p1",
      event_id: "e1",
      user_id: "owner-1",
      role: "MENTOR" as const,
      status: "CONFIRMED" as const,
      user: { id: "owner-1", name: "Ana", email: "ana@ajudadev.dev", role: "USER" as const },
    };
    mockedParticipants
      .mockResolvedValueOnce([ownerRow, requestedRow])
      .mockResolvedValueOnce([ownerRow, { ...requestedRow, status: "CONFIRMED" }]);
    mockedUpdateStatus.mockResolvedValue({ ...requestedRow, status: "CONFIRMED" });
    // O aceite dispara o refresh silencioso do evento (vagas).
    mockedFind.mockResolvedValue({ ...EVENT, category: "MENTORING", max_slots: 2 });
    const user = userEvent.setup();
    renderDetail({ event: { ...EVENT, category: "MENTORING", max_slots: 2 } });

    expect(await screen.findByRole("button", { name: "Aceitar convite" })).toBeInTheDocument();
    expect(screen.getByText("Participantes")).toBeInTheDocument();
    expect(screen.getByText("Lucas Rocha")).toBeInTheDocument();
    expect(screen.getByText("Mentor")).toBeInTheDocument();
    expect(screen.getByText("Mentorado")).toBeInTheDocument();
    expect(screen.getByText("Pendente")).toBeInTheDocument();
    expect(screen.queryByText("Sua participação")).not.toBeInTheDocument();
    expect(screen.queryByText("Convite de mentoria recebido")).not.toBeInTheDocument();
    expect(screen.queryByText("Painel do anfitrião")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Convidar mentorado" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Aceitar convite" }));

    expect(mockedUpdateStatus).toHaveBeenCalledWith("e1", "u1", "CONFIRMED");
    expect(await screen.findByText("Você")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aceitar convite" })).not.toBeInTheDocument();
    expect(screen.queryByText("Pendente")).not.toBeInTheDocument();
  });

  it("dono da comunidade vê o painel de aprovação e aprova atualizando o badge", async () => {
    seedSession("owner-1");
    mockedApprove.mockResolvedValue({ ...EVENT, status: "APPROVED" });
    const user = userEvent.setup();
    renderDetail({
      event: {
        ...EVENT,
        status: "PENDING",
        community: {
          id: "c1",
          name: "Dev SP",
          description: "Comunidade de São Paulo",
          owner: { id: "owner-1", name: "Ana", email: "ana@ajudadev.dev", role: "USER" },
        },
      },
    });

    expect(await screen.findByText("Aprovação do evento")).toBeInTheDocument();
    expect(screen.getByText("Aguardando aprovação")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Aprovar" }));

    expect(mockedApprove).toHaveBeenCalledWith("e1", "APPROVED");
    // A página some com o painel e com o badge: o criador é owner do evento, então
    // quem aparece abaixo é o painel do anfitrião, não a zona de participação.
    expect(await screen.findByText("Painel do anfitrião")).toBeInTheDocument();
    expect(screen.queryByText("Aprovação do evento")).not.toBeInTheDocument();
    expect(screen.queryByText("Aguardando aprovação")).not.toBeInTheDocument();
  });

  it("criador que não é dono da comunidade vê o aviso e não os botões", async () => {
    seedSession("owner-1");
    renderDetail({
      event: {
        ...EVENT,
        status: "PENDING",
        community: {
          id: "c1",
          name: "Dev SP",
          description: "Comunidade de São Paulo",
          owner: { id: "outro", name: "Bea", email: "bea@ajudadev.dev", role: "USER" },
        },
      },
    });

    // O texto do badge e o título do alerta são iguais ("Aguardando aprovação"),
    // então o título é buscado dentro do próprio alerta.
    const notice = await screen.findByText(
      /O responsável pela comunidade ainda não liberou este evento/,
    );
    const alertBox = notice.closest('[role="status"]');
    expect(alertBox).not.toBeNull();
    expect(within(alertBox as HTMLElement).getByText("Aguardando aprovação")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aprovar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rejeitar" })).not.toBeInTheDocument();
  });

  it("criador vê o aviso de rejeitado", async () => {
    seedSession("owner-1");
    renderDetail({
      event: {
        ...EVENT,
        status: "REJECTED",
        community: {
          id: "c1",
          name: "Dev SP",
          description: "Comunidade de São Paulo",
          owner: { id: "outro", name: "Bea", email: "bea@ajudadev.dev", role: "USER" },
        },
      },
    });

    expect(await screen.findByText("Rejeitado")).toBeInTheDocument();
    expect(screen.getByText(/Este evento foi rejeitado pelo responsável pela comunidade/)).toBeInTheDocument();
  });

  it("terceiro em evento aprovado não vê nada de aprovação", async () => {
    renderDetail({ event: { ...EVENT, status: "APPROVED" } });

    await screen.findByRole("heading", { name: "Meetup Dev SP" });
    expect(screen.queryByText("Aprovação do evento")).not.toBeInTheDocument();
    expect(screen.queryByText("Aguardando aprovação")).not.toBeInTheDocument();
    expect(screen.queryByText("Rejeitado")).not.toBeInTheDocument();
  });

  it("dono da comunidade (não criador) vê a gestão do evento e pode excluir", async () => {
    seedSession("dono-c1");
    renderDetail({
      event: {
        ...EVENT,
        community: {
          id: "c1",
          name: "Dev SP",
          description: "Comunidade de São Paulo",
          owner: { id: "dono-c1", name: "Bea", email: "bea@ajudadev.dev", role: "USER" },
        },
      },
    });

    expect(await screen.findByText("Gestão do evento")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir evento" })).toBeInTheDocument();
    expect(screen.queryByText("Painel do anfitrião")).not.toBeInTheDocument();
  });

  it("moderador vê a gestão do evento e pode excluir", async () => {
    localStorage.setItem(
      "ajudadev.user",
      JSON.stringify({ id: "u9", name: "Mod", email: "mod@ajudadev.dev", role: "MODERATOR" }),
    );
    renderDetail({ event: EVENT });

    expect(await screen.findByText("Gestão do evento")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir evento" })).toBeInTheDocument();
  });

  it("usuário comum não vê gestão nem excluir", async () => {
    renderDetail({ event: EVENT });

    await screen.findByRole("heading", { name: "Meetup Dev SP" });
    expect(screen.queryByText("Gestão do evento")).not.toBeInTheDocument();
    expect(screen.queryByText("Painel do anfitrião")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Excluir evento" })).not.toBeInTheDocument();
  });

  it("criador de 1:1 vê o painel e não a zona de participação", async () => {
    seedSession("owner-1");
    renderDetail({ event: { ...EVENT, category: "MENTORING", max_slots: 2 } });

    expect(await screen.findByText("Painel do anfitrião")).toBeInTheDocument();
    expect(screen.queryByText("Sua participação")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar inscrição" })).not.toBeInTheDocument();
  });

  it("criador de evento comum vê o painel e a zona de participação juntos", async () => {
    seedSession("owner-1");
    renderDetail({ event: EVENT });

    expect(await screen.findByText("Painel do anfitrião")).toBeInTheDocument();
    // A zona nasce como spinner: a lista de participantes chega em um fetch à parte.
    expect(await screen.findByText("Sua participação")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Participar" })).toBeInTheDocument();
  });

  it("dono da comunidade se inscreve pelo detalhe: gestão e zona juntas", async () => {
    seedSession("dono-c1");
    renderDetail({
      event: {
        ...EVENT,
        community: {
          id: "c1",
          name: "Dev SP",
          description: "Comunidade de São Paulo",
          owner: { id: "dono-c1", name: "Bea", email: "bea@ajudadev.dev", role: "USER" },
        },
      },
    });

    expect(await screen.findByText("Gestão do evento")).toBeInTheDocument();
    // A zona nasce como spinner: a lista de participantes chega em um fetch à parte.
    expect(await screen.findByText("Sua participação")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Participar" })).toBeInTheDocument();
  });

  it("e-mail não verificado ainda permite participar do evento", async () => {
    seedSession("u1", false);
    mockedFind.mockResolvedValue(EVENT);
    mockedJoinEvent.mockResolvedValue({
      id: "p1",
      event_id: "e1",
      user_id: "u1",
      role: "ATTENDEE",
      status: "CONFIRMED",
    });
    mockedParticipants
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "p1", event_id: "e1", user_id: "u1", role: "ATTENDEE", status: "CONFIRMED" },
      ]);
    const user = userEvent.setup();
    renderDetail({ event: EVENT });

    await user.click(await screen.findByRole("button", { name: "Participar" }));

    expect(mockedJoinEvent).toHaveBeenCalledWith("e1");
    expect(await screen.findByText("Você participa")).toBeInTheDocument();
    expect(screen.queryByText("Confirme seu e-mail para continuar")).not.toBeInTheDocument();
  });

  it("e-mail não verificado ainda permite aceitar convite de mentoria", async () => {
    seedSession("u1", false);
    const requestedRow = {
      id: "p2",
      event_id: "e1",
      user_id: "u1",
      role: "MENTEE" as const,
      status: "REQUESTED" as const,
      user: { id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" as const },
    };
    mockedParticipants
      .mockResolvedValueOnce([requestedRow])
      .mockResolvedValueOnce([{ ...requestedRow, status: "CONFIRMED" }]);
    mockedUpdateStatus.mockResolvedValue({ ...requestedRow, status: "CONFIRMED" });
    mockedFind.mockResolvedValue({ ...EVENT, category: "MENTORING", max_slots: 2 });
    const user = userEvent.setup();
    renderDetail({ event: { ...EVENT, category: "MENTORING", max_slots: 2 } });

    await user.click(await screen.findByRole("button", { name: "Aceitar convite" }));

    expect(mockedUpdateStatus).toHaveBeenCalledWith("e1", "u1", "CONFIRMED");
    expect(await screen.findByText("Confirmado")).toBeInTheDocument();
    expect(screen.queryByText("Sua participação")).not.toBeInTheDocument();
  });

  it("convidado de mentoria vê Reagendar e não vê Excluir", async () => {
    mockedParticipants.mockResolvedValue([
      {
        id: "p2",
        event_id: "e1",
        user_id: "u1",
        role: "MENTEE",
        status: "REQUESTED",
        user: { id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" },
      },
    ]);
    const user = userEvent.setup();
    renderDetail({ event: { ...EVENT, category: "MENTORING", max_slots: 2 } });

    expect(await screen.findByRole("button", { name: "Aceitar convite" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recusar" })).toBeInTheDocument();
    const actionButtons = screen
      .getAllByRole("button")
      .map((button) => button.textContent)
      .filter((label) => ["Aceitar convite", "Recusar", "Reagendar"].includes(label ?? ""));
    expect(actionButtons).toEqual(["Aceitar convite", "Recusar", "Reagendar"]);

    await user.click(screen.getByRole("button", { name: "Reagendar" }));
    expect(
      screen.getByText("Ao reagendar, você confirma o novo horário. A outra pessoa precisa aceitar de novo."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Excluir evento" })).not.toBeInTheDocument();
  });

  it("inscrito de evento de comunidade não vê Reagendar", async () => {
    mockedParticipants.mockResolvedValue([
      {
        id: "p1",
        event_id: "e1",
        user_id: "u1",
        role: "ATTENDEE",
        status: "CONFIRMED",
        user: { id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" },
      },
    ]);
    renderDetail({ event: EVENT });

    expect(await screen.findByText("Você participa")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reagendar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Excluir evento" })).not.toBeInTheDocument();
  });

  it("quem gerencia vê Reagendar e Excluir", async () => {
    seedSession("owner-1");
    renderDetail({ event: EVENT });

    expect(await screen.findByRole("button", { name: "Reagendar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir evento" })).toBeInTheDocument();
  });

  it("reagendar chama o service e atualiza a data na tela", async () => {
    seedSession("owner-1");
    mockedReschedule.mockResolvedValue({
      ...EVENT,
      start_at: "2026-11-02T20:00:00-03:00",
      comment: "Conflito de agenda",
    });
    const user = userEvent.setup();
    renderDetail({ event: EVENT });

    await user.click(await screen.findByRole("button", { name: "Reagendar" }));
    expect(
      screen.queryByText(/A outra pessoa precisa aceitar de novo/),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nova data e hora"), {
      target: { value: futureLocalValue() },
    });
    await user.type(screen.getByLabelText("Motivo do reagendamento"), "Conflito de agenda");
    await user.click(screen.getByRole("button", { name: "Confirmar reagendamento" }));

    expect(mockedReschedule).toHaveBeenCalledWith("e1", {
      startAt: new Date(futureLocalValue()).toISOString(),
      comment: "Conflito de agenda",
    });
    expect((await screen.findAllByText("02/11/2026, 20:00")).length).toBeGreaterThan(0);
    expect(screen.getByText("Evento reagendado")).toBeInTheDocument();
    expect(screen.getByText("Conflito de agenda").closest("[role=status]")).toHaveClass("border-warning");
  });

  it("mentoria reagendada mostra o motivo num card amarelo", async () => {
    seedSession("owner-1");
    renderDetail({
      event: {
        ...EVENT,
        category: "MENTORING",
        max_slots: 2,
        comment: "Sexta 15h encaixa melhor",
      },
    });

    expect(await screen.findByText("Mentoria reagendada")).toBeInTheDocument();
    expect(screen.getByText("Sexta 15h encaixa melhor").closest("[role=status]")).toHaveClass(
      "border-warning",
    );
    expect(screen.queryByText("Observação")).not.toBeInTheDocument();
  });

  it("criador de 1:1 com convite pendente vê Aceitar e Recusar", async () => {
    seedSession("owner-1");
    mockedParticipants.mockResolvedValue([
      {
        id: "p1",
        event_id: "e1",
        user_id: "owner-1",
        role: "MENTEE",
        status: "REQUESTED",
        user: { id: "owner-1", name: "Ana", email: "ana@ajudadev.dev", role: "USER" },
      },
    ]);
    renderDetail({ event: { ...EVENT, category: "MENTORING", max_slots: 2 } });

    expect(await screen.findByRole("button", { name: "Aceitar convite" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recusar" })).toBeInTheDocument();
    expect(screen.getByText("Painel do anfitrião")).toBeInTheDocument();
    expect(screen.queryByText("Sua participação")).not.toBeInTheDocument();

    const actionButtons = screen
      .getAllByRole("button")
      .map((button) => button.textContent)
      .filter((label) =>
        ["Aceitar convite", "Recusar", "Reagendar", "Excluir evento"].includes(label ?? ""),
      );
    expect(actionButtons).toEqual(["Aceitar convite", "Recusar", "Reagendar", "Excluir evento"]);
  });

  it("recusar convite pede motivo e chama o service", async () => {
    const requestedRow = {
      id: "p2",
      event_id: "e1",
      user_id: "u1",
      role: "MENTEE" as const,
      status: "REQUESTED" as const,
      user: { id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" as const },
    };
    mockedParticipants
      .mockResolvedValueOnce([requestedRow])
      .mockResolvedValueOnce([{ ...requestedRow, status: "REJECTED" as const, comment: "Agenda conflitou" }]);
    mockedUpdateStatus.mockResolvedValue({
      ...requestedRow,
      status: "REJECTED",
      comment: "Agenda conflitou",
    });
    mockedFind.mockResolvedValue({ ...EVENT, category: "MENTORING", max_slots: 2 });
    const user = userEvent.setup();
    renderDetail({ event: { ...EVENT, category: "MENTORING", max_slots: 2 } });

    await user.click(await screen.findByRole("button", { name: "Recusar" }));
    expect(screen.getByRole("button", { name: "Reagendar" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Motivo da recusa"), "Agenda conflitou");
    await user.click(screen.getByRole("button", { name: "Confirmar recusa" }));

    expect(mockedUpdateStatus).toHaveBeenCalledWith("e1", "u1", "REJECTED", "Agenda conflitou");
    expect(await screen.findByText("Recusado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aceitar convite" })).not.toBeInTheDocument();
  });

  it("comentário vazio no reagendamento é barrado localmente", async () => {
    seedSession("owner-1");
    const user = userEvent.setup();
    renderDetail({ event: EVENT });

    await user.click(await screen.findByRole("button", { name: "Reagendar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar reagendamento" }));

    expect(await screen.findByText("Informe o motivo do reagendamento")).toBeInTheDocument();
    expect(mockedReschedule).not.toHaveBeenCalled();
  });
});
