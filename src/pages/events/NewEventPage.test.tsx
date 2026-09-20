import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  joinCommunity: vi.fn(),
  leaveCommunity: vi.fn(),
  listCommunities: vi.fn(),
  listUserCommunities: vi.fn(),
}));
vi.mock("../../services/user", () => ({ listUsers: vi.fn() }));
vi.mock("../../services/skill", () => ({ listSkills: vi.fn() }));
vi.mock("../../services/eventUser", () => ({ addParticipant: vi.fn() }));

import { createAddress } from "../../services/address";
import {
  findCommunityById,
  joinCommunity,
  listCommunities,
  listUserCommunities,
} from "../../services/community";
import { createEvent } from "../../services/event";
import { addParticipant } from "../../services/eventUser";
import { listSkills } from "../../services/skill";
import { listUsers } from "../../services/user";

const mockedCreateAddress = vi.mocked(createAddress);
const mockedCreateEvent = vi.mocked(createEvent);
const mockedFindCommunity = vi.mocked(findCommunityById);
const mockedJoinCommunity = vi.mocked(joinCommunity);
const mockedListCommunities = vi.mocked(listCommunities);
const mockedListUserCommunities = vi.mocked(listUserCommunities);
const mockedListUsers = vi.mocked(listUsers);
const mockedListSkills = vi.mocked(listSkills);
const mockedAddParticipant = vi.mocked(addParticipant);

const COMMUNITY: Community = {
  id: "c1",
  name: "Comunidade de origem",
  description: "comunidade de testes",
  address: { id: "a-c1", zip_code: "01001000", city: "São Paulo", state: "SP" },
  owner: { id: "dono-c1", name: "Bea", email: "bea@ajudadev.dev", role: "USER" },
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

function seedSession(emailVerified = true) {
  localStorage.setItem(
    "ajudadev.user",
    JSON.stringify({
      id: "u1",
      name: "Lucas Rocha",
      email: "lucas@ajudadev.dev",
      role: "USER",
      emailVerified,
    }),
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
    mockedJoinCommunity.mockResolvedValue({ id: "m1", community_id: "c1", user_id: "u1" });
    mockedListCommunities.mockResolvedValue(emptyPage());
    mockedListUserCommunities.mockResolvedValue(emptyPage());
    mockedListUsers.mockResolvedValue({ data: [], has_next: false });
    mockedListSkills.mockResolvedValue({ data: [], has_next: false });
    mockedAddParticipant.mockResolvedValue({
      id: "p1",
      event_id: "e1",
      user_id: "u2",
      role: "MENTEE",
      status: "REQUESTED",
    });
  });

  it("título e descrição vazios são barrados localmente sem chamar a API", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("Informe o título do evento")).toBeInTheDocument();
    expect(screen.getByText("Informe a descrição do evento")).toBeInTheDocument();
    expect(mockedCreateEvent).not.toHaveBeenCalled();
  });

  it("descrição acima de 500 caracteres é barrada localmente", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Título"), "Meetup");
    fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "a".repeat(501) } });
    await user.type(screen.getByLabelText("Data e hora"), futureLocalValue());
    await user.type(screen.getByLabelText("Duração (minutos)"), "60");
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("A descrição deve ter no máximo 500 caracteres")).toBeInTheDocument();
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

  it("MENTORING troca a comunidade pela busca de pessoas por nome ou habilidade", async () => {
    mockedListUsers.mockResolvedValue({
      data: [{ id: "u2", name: "Ana Souza", skills: [{ id: "s1", name: "GO" }] }],
      has_next: false,
    });
    mockedListSkills.mockResolvedValue({ data: [{ id: "s1", name: "GO" }], has_next: false });
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText("Comunidade")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Categoria"), "MENTORING");

    expect(screen.queryByText("Comunidade")).not.toBeInTheDocument();
    expect(screen.getByText("Pessoa convidada")).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar por nome")).toBeInTheDocument();
    expect(await screen.findByRole("radio", { name: /Ana Souza/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Ana Souza/ }).closest("label")).toHaveTextContent(
      "GO",
    );
    expect(screen.getByRole("radio", { name: "Sem convite agora" })).toBeChecked();
  });

  it("MENTORING não lista a pessoa logada como convidada", async () => {
    mockedListUsers.mockResolvedValue({
      data: [
        { id: "u1", name: "Lucas Rocha", skills: [] },
        { id: "u2", name: "Ana Souza", skills: [] },
      ],
      has_next: false,
    });
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText("Categoria"), "MENTORING");

    expect(await screen.findByRole("radio", { name: "Ana Souza" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Lucas Rocha" })).not.toBeInTheDocument();
  });

  it("MENTORING com pessoa escolhida cria o 1:1 e convida no papel complementar", async () => {
    mockedListUsers.mockResolvedValue({
      data: [{ id: "u2", name: "Ana Souza", skills: [] }],
      has_next: false,
    });
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText("Categoria"), "MENTORING");
    await user.click(await screen.findByRole("radio", { name: "Ana Souza" }));
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("Detalhe do evento")).toBeInTheDocument();
    expect(mockedCreateEvent.mock.calls[0][0]).toMatchObject({
      category: "MENTORING",
      creator_role: "MENTOR",
    });
    expect(mockedCreateEvent.mock.calls[0][0].community_id).toBeUndefined();
    expect(mockedAddParticipant).toHaveBeenCalledWith("e1", { userId: "u2", role: "MENTEE" });
    expect(mockedCreateEvent.mock.invocationCallOrder[0]).toBeLessThan(
      mockedAddParticipant.mock.invocationCallOrder[0],
    );
  });

  it("MENTORING como mentorado convida a pessoa como mentor", async () => {
    mockedListUsers.mockResolvedValue({
      data: [{ id: "u2", name: "Ana Souza", skills: [] }],
      has_next: false,
    });
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText("Categoria"), "MENTORING");
    await user.selectOptions(screen.getByLabelText("Meu papel nesta mentoria"), "MENTEE");
    await user.click(await screen.findByRole("radio", { name: "Ana Souza" }));
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("Detalhe do evento")).toBeInTheDocument();
    expect(mockedCreateEvent.mock.calls[0][0].creator_role).toBe("MENTEE");
    expect(mockedAddParticipant).toHaveBeenCalledWith("e1", { userId: "u2", role: "MENTOR" });
  });

  it("MENTORING sem pessoa escolhida cria o 1:1 sem convite", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText("Categoria"), "MENTORING");
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("Detalhe do evento")).toBeInTheDocument();
    expect(mockedAddParticipant).not.toHaveBeenCalled();
  });

  it("MENTORING ignora comunidade da URL e não envia community_id", async () => {
    mockedFindCommunity.mockResolvedValue(COMMUNITY);
    const user = userEvent.setup();
    renderPage("/eventos/novo?community_id=c1");

    expect(await screen.findByRole("radio", { name: /Comunidade de origem/ })).toBeChecked();
    await user.selectOptions(screen.getByLabelText("Categoria"), "MENTORING");
    expect(screen.queryByText("Comunidade")).not.toBeInTheDocument();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("Detalhe do evento")).toBeInTheDocument();
    expect(mockedCreateEvent.mock.calls[0][0].community_id).toBeUndefined();
    expect(mockedAddParticipant).not.toHaveBeenCalled();
  });

  it("convite que falha mantém o 1:1 criado e leva até ele", async () => {
    mockedListUsers.mockResolvedValue({
      data: [{ id: "u2", name: "Ana Souza", skills: [] }],
      has_next: false,
    });
    mockedAddParticipant.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 500",
      response: { status: 500, data: { message: "internal server error", code: 500 } },
    });
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText("Categoria"), "MENTORING");
    await user.click(await screen.findByRole("radio", { name: "Ana Souza" }));
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(
      await screen.findByText("O 1:1 foi criado, mas o convite para Ana Souza não foi enviado"),
    ).toBeInTheDocument();
    expect(screen.getByText("Erro interno no servidor")).toBeInTheDocument();
    expect(screen.queryByText("Detalhe do evento")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Criar evento" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ir para o 1:1" }));
    expect(await screen.findByText("Detalhe do evento")).toBeInTheDocument();
  });

  it("voltar de MENTORING para evento comum restaura a comunidade", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText("Categoria"), "MENTORING");
    expect(screen.getByText("Pessoa convidada")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Categoria"), "COMMUNITY_EVENT");
    expect(screen.getByText("Comunidade")).toBeInTheDocument();
    expect(screen.queryByText("Pessoa convidada")).not.toBeInTheDocument();
  });

  it("COMMUNITY_EVENT explica que o palestrante ocupa vaga e quem organiza não", async () => {
    renderPage();

    expect(screen.getByLabelText("Vagas")).toBeInTheDocument();
    expect(
      screen.getByText(
        "O palestrante confirmado ocupa uma vaga. Quem organiza não ocupa, a menos que também se inscreva. Ex.: 10 ouvintes + palestrante = 11 vagas. Deixe em branco para não limitar.",
      ),
    ).toBeInTheDocument();
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

  it("ONLINE com javascript: no link é barrado localmente sem chamar a API", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillRequired(user);
    fireEvent.change(screen.getByLabelText("Link do encontro"), {
      target: { value: "javascript:alert(1)" },
    });
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(
      await screen.findByText("Informe um link http(s) válido (ex.: https://exemplo.com)"),
    ).toBeInTheDocument();
    expect(mockedCreateEvent).not.toHaveBeenCalled();
    expect(screen.queryByText("Detalhe do evento")).not.toBeInTheDocument();
  });

  it("?start_at na URL pré-preenche data e hora", () => {
    renderPage("/eventos/novo?start_at=2026-10-01T14:00");
    expect(screen.getByLabelText("Data e hora")).toHaveValue("2026-10-01T14:00");
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

  it("o picker lista as comunidades do usuário logado (criadas e de membro)", async () => {
    renderPage();

    await waitFor(() =>
      expect(mockedListCommunities).toHaveBeenCalledWith({
        page: 1,
        name: "",
        ownerId: "u1",
      }),
    );
    expect(mockedListUserCommunities).toHaveBeenCalledWith({ userId: "u1", page: 1 });
  });

  it("não sendo o responsável, o aviso explica membership e aprovação", async () => {
    mockedFindCommunity.mockResolvedValue(COMMUNITY);
    renderPage("/eventos/novo?community_id=c1");

    expect(
      await screen.findByText(
        "Só o responsável ou membros da comunidade podem criar eventos nela, e eventos criados por membros passam pela aprovação do responsável antes de aparecer no catálogo.",
      ),
    ).toBeInTheDocument();
  });

  it("responsável pela comunidade vê que o evento entra direto no catálogo", async () => {
    mockedFindCommunity.mockResolvedValue({
      ...COMMUNITY,
      owner: { id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" },
    });
    renderPage("/eventos/novo?community_id=c1");

    expect(
      await screen.findByText(
        "Você é o responsável por esta comunidade: o evento entra direto no catálogo, sem fila de aprovação.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/passam pela aprovação do responsável/)).not.toBeInTheDocument();
  });

  it("comunidade sem owner no payload cai no aviso de aprovação", async () => {
    mockedFindCommunity.mockResolvedValue({ ...COMMUNITY, owner: null });
    renderPage("/eventos/novo?community_id=c1");

    expect(await screen.findByText(/passam pela aprovação do responsável/)).toBeInTheDocument();
  });

  it("comunidade da URL sem membership oferece o atalho de entrar", async () => {
    mockedFindCommunity.mockResolvedValue(COMMUNITY);
    renderPage("/eventos/novo?community_id=c1");

    expect(
      await screen.findByRole("button", { name: "Entrar na comunidade" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("É preciso ser membro para criar um evento nesta comunidade."),
    ).toBeInTheDocument();
  });

  it("entrar na comunidade chama a API, esconde o atalho e confirma", async () => {
    mockedFindCommunity.mockResolvedValue(COMMUNITY);
    const user = userEvent.setup();
    renderPage("/eventos/novo?community_id=c1");

    await user.click(await screen.findByRole("button", { name: "Entrar na comunidade" }));

    expect(mockedJoinCommunity).toHaveBeenCalledWith("c1");
    expect(await screen.findByText("Você é membro desta comunidade.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Entrar na comunidade" }),
    ).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("ajudadev.memberships.u1") ?? "[]")).toContain("c1");
  });

  it("400 de quem já era membro reconcilia o cache e avisa, sem duplicar confirmação", async () => {
    mockedFindCommunity.mockResolvedValue(COMMUNITY);
    mockedJoinCommunity.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 400",
      response: { status: 400, data: { message: "user is already a member", code: 400 } },
    });
    const user = userEvent.setup();
    renderPage("/eventos/novo?community_id=c1");

    await user.click(await screen.findByRole("button", { name: "Entrar na comunidade" }));

    expect(await screen.findByText("Você já é membro desta comunidade.")).toBeInTheDocument();
    expect(screen.queryByText("Você é membro desta comunidade.")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Entrar na comunidade" }),
    ).not.toBeInTheDocument();
  });

  it("falha ao entrar mostra a mensagem do hook e mantém o atalho", async () => {
    mockedFindCommunity.mockResolvedValue(COMMUNITY);
    mockedJoinCommunity.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 500",
      response: { status: 500, data: { message: "internal server error", code: 500 } },
    });
    const user = userEvent.setup();
    renderPage("/eventos/novo?community_id=c1");

    await user.click(await screen.findByRole("button", { name: "Entrar na comunidade" }));

    expect(await screen.findByText("Não foi possível entrar na comunidade.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar na comunidade" })).toBeInTheDocument();
  });

  it("429 ao entrar na comunidade mostra a quota e mantém o atalho", async () => {
    mockedFindCommunity.mockResolvedValue(COMMUNITY);
    mockedJoinCommunity.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 429",
      response: {
        status: 429,
        data: {
          message: "community memberships limit reached",
          error: "too_many_requests",
          code: 429,
        },
      },
    });
    const user = userEvent.setup();
    renderPage("/eventos/novo?community_id=c1");

    await user.click(await screen.findByRole("button", { name: "Entrar na comunidade" }));

    expect(
      await screen.findByText("Você atingiu o limite de comunidades das quais pode participar"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar na comunidade" })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("ajudadev.memberships.u1") ?? "[]")).not.toContain("c1");
  });

  it("responsável pela comunidade não vê o atalho de entrar", async () => {
    mockedFindCommunity.mockResolvedValue({
      ...COMMUNITY,
      owner: { id: "u1", name: "Lucas Rocha", email: "lucas@ajudadev.dev", role: "USER" },
    });
    renderPage("/eventos/novo?community_id=c1");

    await screen.findByText(/o evento entra direto no catálogo/);
    expect(
      screen.queryByRole("button", { name: "Entrar na comunidade" }),
    ).not.toBeInTheDocument();
  });

  it("quem já está no cache de memberships não vê o atalho de entrar", async () => {
    localStorage.setItem("ajudadev.memberships.u1", JSON.stringify(["c1"]));
    mockedFindCommunity.mockResolvedValue(COMMUNITY);
    renderPage("/eventos/novo?community_id=c1");

    await screen.findByRole("radio", { name: /Comunidade de origem/ });
    expect(
      screen.queryByRole("button", { name: "Entrar na comunidade" }),
    ).not.toBeInTheDocument();
  });

  it("comunidade escolhida no picker (própria ou de membro) não mostra o atalho", async () => {
    mockedListCommunities.mockResolvedValue({ data: [COMMUNITY], has_next: false });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("radio", { name: /Comunidade de origem/ }));

    expect(
      screen.queryByRole("button", { name: "Entrar na comunidade" }),
    ).not.toBeInTheDocument();
  });

  it("sem vínculo com comunidade o aviso não aparece", async () => {
    renderPage();

    await screen.findByText("Sem vínculo: o evento será publicado de forma avulsa.");
    expect(
      screen.queryByText(/Só o responsável ou membros da comunidade podem criar eventos nela/),
    ).not.toBeInTheDocument();
  });

  it("403 de quem não é membro aparece traduzido no formulário", async () => {
    mockedFindCommunity.mockResolvedValue(COMMUNITY);
    mockedCreateEvent.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 403",
      response: {
        status: 403,
        data: {
          message: "only community members can create events for this community",
          code: 403,
        },
      },
    });
    const user = userEvent.setup();
    renderPage("/eventos/novo?community_id=c1");

    await screen.findByRole("radio", { name: /Comunidade de origem/ });
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(
      await screen.findByText("Só o responsável ou membros da comunidade podem criar eventos nela"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Detalhe do evento")).not.toBeInTheDocument();
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

  it("conflito de horário da comunidade aparece no campo de data", async () => {
    mockedCreateEvent.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 400",
      response: {
        status: 400,
        data: {
          message: "Invalid event data",
          code: 400,
          causes: [{ field: "start_at", message: "community already has an event at that time" }],
        },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(
      await screen.findByText("Já existe um evento desta comunidade nesse horário"),
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

  it("e-mail não verificado troca o formulário pelo aviso e não chama a API", async () => {
    seedSession(false);
    mockedFindCommunity.mockResolvedValue(COMMUNITY);
    const user = userEvent.setup();
    renderPage("/eventos/novo?community_id=c1");

    expect(screen.queryByRole("button", { name: "Criar evento" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Entrar na comunidade" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Confirme seu e-mail para continuar");
    expect(screen.getByRole("link", { name: "Confirmar e-mail" })).toHaveAttribute(
      "href",
      "/confirmar-email",
    );

    await user.click(screen.getByRole("link", { name: "Confirmar e-mail" }));
    expect(mockedCreateEvent).not.toHaveBeenCalled();
    expect(mockedJoinCommunity).not.toHaveBeenCalled();
  });

  it("429 de quota mostra o alerta em pt-BR e permanece no formulário", async () => {
    mockedCreateEvent.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 429",
      response: {
        status: 429,
        data: { message: "pending events limit reached", error: "too_many_requests", code: 429 },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(
      await screen.findByText("Você atingiu o limite de eventos aguardando aprovação"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Detalhe do evento")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toHaveValue("Meetup Dev SP");
  });

  it("429 de eventos ativos e de rate aparecem traduzidos, sem redirect", async () => {
    mockedCreateEvent.mockRejectedValueOnce({
      isAxiosError: true,
      message: "Request failed with status code 429",
      response: {
        status: 429,
        data: { message: "active events limit reached", error: "too_many_requests", code: 429 },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(await screen.findByText("Você atingiu o limite de eventos ativos")).toBeInTheDocument();
    expect(screen.queryByText("Detalhe do evento")).not.toBeInTheDocument();

    mockedCreateEvent.mockRejectedValueOnce({
      isAxiosError: true,
      message: "Request failed with status code 429",
      response: {
        status: 429,
        data: { message: "too many event creations", error: "too_many_requests", code: 429 },
      },
    });
    await user.click(screen.getByRole("button", { name: "Criar evento" }));

    expect(
      await screen.findByText("Muitas criações de evento. Aguarde e tente de novo"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Detalhe do evento")).not.toBeInTheDocument();
  });
});
