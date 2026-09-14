import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import type { Address, Community, EventItem, Pageable } from "../../types/api";
import { NewEventPage } from "./NewEventPage";

vi.mock("../../services/address", () => ({ createAddress: vi.fn() }));
vi.mock("../../services/event", () => ({
  createEvent: vi.fn(),
  deleteEvent: vi.fn(),
  findEventById: vi.fn(),
  listEvents: vi.fn(),
}));
vi.mock("../../services/community", () => ({
  findCommunityById: vi.fn(),
  listCommunities: vi.fn(),
}));

import { createAddress } from "../../services/address";
import { findCommunityById, listCommunities } from "../../services/community";
import { createEvent } from "../../services/event";

const mockedCreateAddress = vi.mocked(createAddress);
const mockedCreateEvent = vi.mocked(createEvent);
const mockedFindCommunity = vi.mocked(findCommunityById);
const mockedListCommunities = vi.mocked(listCommunities);

const COMMUNITY: Community = {
  id: "c1",
  name: "Comunidade de origem",
  description: "comunidade de testes",
  address: { id: "a-c1", zip_code: "01001000", city: "São Paulo", state: "SP" },
};

function emptyPage(): Pageable<Community> {
  return { data: [], has_next: false };
}

const ADDRESS: Address = {
  id: "a1",
  zip_code: "01310100",
  street: "Avenida Paulista",
  number: "1000",
  city: "São Paulo",
  state: "SP",
};

const CREATED: EventItem = {
  id: "e1",
  title: "Meetup Dev SP",
  description: "Encontro mensal",
  category: "COMMUNITY_EVENT",
  type: "ONLINE",
  start_at: "2026-10-01T21:00:00.000Z",
  duration_min: 90,
};

function seedSession() {
  localStorage.setItem("ajudadev.token", "token-123");
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({ id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" }),
  );
}

function renderPage(entry = "/eventos/novo") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <Routes>
          <Route path="/eventos/novo" element={<NewEventPage />} />
          <Route path="/eventos/:id" element={<p>Detalhe do evento</p>} />
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

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Título"), "Meetup Dev SP");
  await user.type(screen.getByLabelText("Descrição"), "Encontro mensal");
  await user.type(screen.getByLabelText("Data e hora"), futureLocalValue());
  await user.type(screen.getByLabelText("Duração (minutos)"), "90");
}

describe("NewEventPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    seedSession();
    mockedCreateAddress.mockResolvedValue(ADDRESS);
    mockedCreateEvent.mockResolvedValue(CREATED);
    mockedFindCommunity.mockResolvedValue(null);
    mockedListCommunities.mockResolvedValue(emptyPage());
  });

  it("título e descrição vazios são barrados localmente sem chamar a API", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("Informe o título do evento")).toBeInTheDocument();
    expect(screen.getByText("Informe a descrição do evento")).toBeInTheDocument();
    expect(mockedCreateEvent).not.toHaveBeenCalled();
  });

  it("data no passado é barrada localmente", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Título"), "Meetup");
    await user.type(screen.getByLabelText("Descrição"), "descrição");
    await user.type(screen.getByLabelText("Data e hora"), "2020-01-01T10:00");
    await user.type(screen.getByLabelText("Duração (minutos)"), "60");
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(
      await screen.findByText("A data do evento precisa ser no futuro"),
    ).toBeInTheDocument();
    expect(mockedCreateEvent).not.toHaveBeenCalled();
  });

  it("duração zero é barrada localmente", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Título"), "Meetup");
    await user.type(screen.getByLabelText("Descrição"), "descrição");
    await user.type(screen.getByLabelText("Data e hora"), futureLocalValue());
    await user.type(screen.getByLabelText("Duração (minutos)"), "0");
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("Informe uma duração maior que zero")).toBeInTheDocument();
    expect(mockedCreateEvent).not.toHaveBeenCalled();
  });

  it("formato ONLINE esconde o endereço e mostra o link do encontro", async () => {
    renderPage();

    expect(screen.queryByText("Endereço do evento")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Link do encontro")).toBeInTheDocument();
  });

  it("trocar para INPERSON mostra o AddressPicker e esconde o link", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText("Formato"), "INPERSON");

    expect(screen.getByText("Endereço do evento")).toBeInTheDocument();
    expect(screen.queryByLabelText("Link do encontro")).not.toBeInTheDocument();
  });

  it("HYBRID exige endereço e mantém o link", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText("Formato"), "HYBRID");

    expect(screen.getByText("Endereço do evento")).toBeInTheDocument();
    expect(screen.getByLabelText("Link do encontro")).toBeInTheDocument();
  });

  it("INPERSON sem endereço é barrado localmente", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText("Formato"), "INPERSON");
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(
      await screen.findByText("Busque ou selecione o endereço do evento"),
    ).toBeInTheDocument();
    expect(mockedCreateEvent).not.toHaveBeenCalled();
  });

  it("MENTORING mostra o box informativo e esconde as vagas", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText("Categoria"), "MENTORING");

    expect(screen.getByRole("status")).toHaveTextContent("Mentoria 1:1");
    expect(screen.getByText(/Vaga única/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Vagas")).not.toBeInTheDocument();
  });

  it("MENTORING deixa escolher o papel de quem cria e envia creator_role", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText("Categoria"), "MENTORING");
    expect(screen.getByLabelText("Meu papel nesta mentoria")).toHaveValue("MENTOR");

    await user.selectOptions(screen.getByLabelText("Meu papel nesta mentoria"), "MENTEE");
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("Detalhe do evento")).toBeInTheDocument();
    expect(mockedCreateEvent.mock.calls[0][0].creator_role).toBe("MENTEE");
  });

  it("evento comum não mostra o papel de quem cria nem envia creator_role", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByLabelText("Meu papel nesta mentoria")).not.toBeInTheDocument();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("Detalhe do evento")).toBeInTheDocument();
    expect(mockedCreateEvent.mock.calls[0][0].creator_role).toBeUndefined();
  });

  it("voltar de MENTORING para evento comum descarta o papel escolhido", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText("Categoria"), "MENTORING");
    await user.selectOptions(screen.getByLabelText("Meu papel nesta mentoria"), "MENTEE");
    await user.selectOptions(screen.getByLabelText("Categoria"), "COMMUNITY_EVENT");
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("Detalhe do evento")).toBeInTheDocument();
    expect(mockedCreateEvent.mock.calls[0][0].creator_role).toBeUndefined();
  });

  it("cause de creator_role vira erro no campo do papel", async () => {
    mockedCreateEvent.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 400",
      response: {
        status: 400,
        data: {
          message: "Invalid event data",
          code: 400,
          causes: [
            { field: "creator_role", message: "CreatorRole is not valid, use MENTOR or MENTEE" },
          ],
        },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText("Categoria"), "MENTORING");
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(
      await screen.findByText("Papel de quem cria inválido: use mentor ou mentorado"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Detalhe do evento")).not.toBeInTheDocument();
  });

  it("fluxo feliz ONLINE envia payload sem endereço e navega sem state", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillRequired(user);
    await user.type(screen.getByLabelText("Link do encontro"), "https://meet.example.com/x");
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("Detalhe do evento")).toBeInTheDocument();
    const payload = mockedCreateEvent.mock.calls[0][0];
    expect(payload).toMatchObject({
      title: "Meetup Dev SP",
      description: "Encontro mensal",
      category: "COMMUNITY_EVENT",
      type: "ONLINE",
      duration_min: 90,
      meeting_link: "https://meet.example.com/x",
      max_slots: null,
    });
    expect(payload.address_id).toBeUndefined();
    expect(payload.community_id).toBeUndefined();
    expect(new Date(payload.start_at).getTime()).toBeGreaterThan(Date.now());
  });

  it("?community_id na URL pré-seleciona a comunidade e envia o vínculo", async () => {
    mockedFindCommunity.mockResolvedValue(COMMUNITY);
    const user = userEvent.setup();
    renderPage("/eventos/novo?community_id=c1");

    expect(await screen.findByRole("radio", { name: /Comunidade de origem/ })).toBeChecked();
    expect(mockedFindCommunity).toHaveBeenCalledWith("c1");

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("Detalhe do evento")).toBeInTheDocument();
    expect(mockedCreateEvent.mock.calls[0][0].community_id).toBe("c1");
  });

  it("sem ?community_id o evento nasce avulso", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Sem vínculo: o evento será publicado de forma avulsa.")).toBeInTheDocument();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("Detalhe do evento")).toBeInTheDocument();
    expect(mockedCreateEvent.mock.calls[0][0].community_id).toBeUndefined();
  });

  it("escolher uma comunidade no picker envia o community_id", async () => {
    mockedListCommunities.mockResolvedValue({ data: [COMMUNITY], has_next: false });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("radio", { name: /Comunidade de origem/ }));
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("Detalhe do evento")).toBeInTheDocument();
    expect(mockedCreateEvent.mock.calls[0][0].community_id).toBe("c1");
  });

  it("escolher e depois limpar o vínculo volta a criar evento avulso", async () => {
    mockedListCommunities.mockResolvedValue({ data: [COMMUNITY], has_next: false });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("radio", { name: /Comunidade de origem/ }));
    await user.click(screen.getByRole("radio", { name: /Sem comunidade/ }));
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("Detalhe do evento")).toBeInTheDocument();
    expect(mockedCreateEvent.mock.calls[0][0].community_id).toBeUndefined();
  });

  it("o picker só lista comunidades do usuário logado", async () => {
    renderPage();

    await waitFor(() =>
      expect(mockedListCommunities).toHaveBeenCalledWith({
        page: 1,
        name: "",
        ownerId: "u1",
      }),
    );
  });

  it("comunidade da URL não encontrada avisa e cria sem vínculo", async () => {
    mockedFindCommunity.mockResolvedValue(null);
    const user = userEvent.setup();
    renderPage("/eventos/novo?community_id=sumida");

    expect(
      await screen.findByText(
        "A comunidade informada não foi encontrada. O evento será criado sem vínculo.",
      ),
    ).toBeInTheDocument();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("Detalhe do evento")).toBeInTheDocument();
    expect(mockedCreateEvent.mock.calls[0][0].community_id).toBeUndefined();
  });

  it("vagas preenchidas vão como número no payload", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillRequired(user);
    await user.type(screen.getByLabelText("Vagas"), "30");
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("Detalhe do evento")).toBeInTheDocument();
    expect(mockedCreateEvent.mock.calls[0][0].max_slots).toBe(30);
  });

  it("causes da API viram erro no campo correspondente", async () => {
    mockedCreateEvent.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 400",
      response: {
        status: 400,
        data: {
          message: "Invalid event data",
          code: 400,
          causes: [{ field: "start_at", message: "StartAt must be in the future" }],
        },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(
      await screen.findByText("A data do evento precisa ser no futuro"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Detalhe do evento")).not.toBeInTheDocument();
  });

  it("erro sem causes mostra Alert com a mensagem traduzida", async () => {
    mockedCreateEvent.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 400",
      response: {
        status: 400,
        data: {
          message: "Invalid event data",
          code: 400,
          causes: [{ field: "address_id", message: "address_id is not valid, not found this address" }],
        },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("Endereço não encontrado")).toBeInTheDocument();
  });
});
