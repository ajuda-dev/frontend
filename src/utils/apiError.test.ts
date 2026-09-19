import { describe, expect, it } from "vitest";
import { apiErrorFields, fieldLabel, hasApiMessage, toUserMessages, translateApiMessage } from "./apiError";

function apiError(status: number, data: unknown) {
  return {
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    response: { status, data },
  };
}

describe("translateApiMessage", () => {
  it("traduz as mensagens conhecidas dos validators do backend", () => {
    expect(translateApiMessage("Name is not valid")).toBe("Nome inválido");
    expect(translateApiMessage("Email cannot be empty")).toBe("Informe o e-mail");
    expect(translateApiMessage("Password must be at least 6 characters long")).toBe(
      "A senha deve ter ao menos 6 caracteres",
    );
    expect(translateApiMessage("Email already exists")).toBe("Este e-mail já está cadastrado");
    expect(translateApiMessage("Address already exists")).toBe("Este endereço já está cadastrado");
    expect(translateApiMessage("already has a community with this name")).toBe(
      "Já existe uma comunidade com este nome",
    );
    expect(translateApiMessage("community has associated members; remove them before deleting")).toBe(
      "Esta comunidade ainda tem membros; remova todos antes de excluir",
    );
    expect(translateApiMessage("only the community owner can delete this community")).toBe(
      "Apenas o responsável, moderadores e administradores podem excluir esta comunidade",
    );
    expect(translateApiMessage("invalid search address data")).toBe(
      "Não foi possível localizar este CEP",
    );
    expect(translateApiMessage("forbidden")).toBe("Você não tem permissão para esta ação");
    expect(translateApiMessage("invalid credentials")).toBe("E-mail ou senha inválidos");
    expect(translateApiMessage("invalid or expired code")).toBe("Código inválido ou expirado");
    expect(translateApiMessage("too many password reset requests")).toBe(
      "Muitas solicitações de recuperação. Aguarde um pouco e tente de novo",
    );
    expect(translateApiMessage("too many password reset attempts")).toBe(
      "Muitas tentativas com este código. Aguarde e solicite um novo",
    );
    expect(translateApiMessage("too many verification attempts")).toBe(
      "Muitas tentativas de confirmação. Aguarde e tente de novo",
    );
    expect(translateApiMessage("too many verification emails")).toBe(
      "Muitos reenvios. Aguarde um pouco antes de pedir outro código",
    );
    expect(translateApiMessage("email is not verified")).toBe("Confirme seu e-mail para continuar");
    expect(translateApiMessage("code cannot be empty")).toBe("Informe o código");
    expect(translateApiMessage("only admins can delete users")).toBe(
      "Apenas administradores podem excluir usuários",
    );
    expect(translateApiMessage("cannot delete user with active associations")).toBe(
      "Não é possível excluir um usuário com vínculos ativos",
    );
    expect(translateApiMessage("Skill already exists")).toBe(
      "Já existe uma habilidade com este nome",
    );
    expect(translateApiMessage("only moderators and admins can delete skills")).toBe(
      "Apenas moderadores e administradores podem arquivar habilidades",
    );
    expect(translateApiMessage("user already has this skill")).toBe(
      "Este usuário já possui esta habilidade",
    );
    expect(
      translateApiMessage("only the user themselves or an admin can manage this user's skills"),
    ).toBe(
      "Apenas o próprio usuário ou um administrador podem gerenciar as habilidades deste usuário",
    );
    expect(translateApiMessage("comment is required when rejecting")).toBe(
      "Informe o motivo da recusa",
    );
    expect(translateApiMessage("comment is required when cancelling")).toBe(
      "Informe o motivo do cancelamento",
    );
    expect(translateApiMessage("comment is required when rescheduling")).toBe(
      "Informe o motivo do reagendamento",
    );
    expect(translateApiMessage("comment must have at most 500 characters")).toBe(
      "O comentário deve ter no máximo 500 caracteres",
    );
    expect(translateApiMessage("Invalid skill data")).toBe("Dados da habilidade inválidos");
    expect(translateApiMessage("Invalid skill user data")).toBe(
      "Dados da habilidade do usuário inválidos",
    );
  });

  it("mensagem desconhecida cai no fallback (null)", () => {
    expect(translateApiMessage("something brand new")).toBeNull();
    expect(translateApiMessage(undefined)).toBeNull();
  });

  it("chaves removidas (não emitidas pelo backend) devolvem null", () => {
    expect(translateApiMessage("Community already exists")).toBeNull();
    expect(translateApiMessage("cannot delete community with active members")).toBeNull();
    expect(translateApiMessage("user already joined this community")).toBeNull();
    expect(translateApiMessage("user already joined this event")).toBeNull();
    expect(translateApiMessage("Password is not valid")).toBeNull();
    expect(translateApiMessage("invalid data")).toBeNull();
  });

  it("traduz as mensagens de participação em eventos (plano 11)", () => {
    expect(translateApiMessage("event is full")).toBe("O evento está cheio");
    expect(translateApiMessage("user is already invited to this event")).toBe(
      "Este usuário já tem convite pendente neste evento",
    );
    expect(translateApiMessage("user is already a participant of this event")).toBe(
      "Este usuário já participa deste evento",
    );
    expect(translateApiMessage("event already has a confirmed mentee")).toBe(
      "Esta mentoria já tem um mentorado confirmado",
    );
    expect(translateApiMessage("user_id is not valid, not found this user")).toBe(
      "Usuário não encontrado",
    );
  });

  it("transição de status inválida (mensagem dinâmica do repo) é traduzida", () => {
    expect(translateApiMessage("invalid status transition from REJECTED to CANCELLED")).toBe(
      "Esta ação não é permitida no estado atual da participação",
    );
  });

  it("traduz as mensagens de eventos e participação (plano 17)", () => {
    expect(translateApiMessage("Invalid participation data")).toBe(
      "Dados da participação inválidos",
    );
    expect(translateApiMessage("event is not approved yet")).toBe(
      "Este evento ainda não foi aprovado pela comunidade",
    );
    expect(translateApiMessage("event is not public yet")).toBe(
      "Este evento ainda está fechado — as inscrições abrem quando for tornado público",
    );
    expect(translateApiMessage("community event allows only one speaker")).toBe(
      "Este evento já tem um palestrante. Para outro, crie um evento em outro horário",
    );
    expect(translateApiMessage("community already has an event at that time")).toBe(
      "Já existe um evento desta comunidade nesse horário",
    );
    expect(translateApiMessage("speaker must confirm the schedule first")).toBe(
      "O palestrante precisa confirmar o horário antes de publicar",
    );
    expect(translateApiMessage("event owner must accept the new time")).toBe(
      "Quem organiza precisa aceitar o novo horário antes de publicar",
    );
    expect(translateApiMessage("only the invited user can accept or reject this invitation")).toBe(
      "Só quem recebeu o convite pode aceitar ou recusá-lo",
    );
    expect(translateApiMessage("the creator cannot leave the event; cancel the event instead")).toBe(
      "Quem criou o evento não pode sair dele — cancele o evento",
    );
    expect(
      translateApiMessage("only the event owner, the community owner or moderators can manage this event"),
    ).toBe(
      "Apenas quem criou o evento, o responsável pela comunidade (ou moderadores e administradores) pode gerenciá-lo",
    );
    expect(
      translateApiMessage(
        "only the event owner, the invited participant, the community owner or moderators can reschedule this event",
      ),
    ).toBe(
      "Apenas quem criou o evento, o convidado da mentoria, o responsável pela comunidade (ou moderadores e administradores) pode reagendá-lo",
    );
    expect(translateApiMessage("only the community owner can approve this event")).toBe(
      "Apenas o responsável pela comunidade (ou moderadores e administradores) pode aprovar este evento",
    );
    expect(translateApiMessage("only the community owner can filter events by approval status")).toBe(
      "Apenas o responsável pela comunidade pode filtrar por situação de aprovação",
    );
    expect(translateApiMessage("only community members can create events for this community")).toBe(
      "Só o responsável ou membros da comunidade podem criar eventos nela",
    );
    expect(translateApiMessage("only moderators and admins can read another user's agenda")).toBe(
      "Apenas moderadores e administradores podem ver a agenda de outra pessoa",
    );
    expect(translateApiMessage("CreatorRole is only allowed for MENTORING events")).toBe(
      "O papel de quem cria só vale em eventos de mentoria",
    );
    expect(translateApiMessage("CreatorRole is not valid, use MENTOR or MENTEE")).toBe(
      "Papel de quem cria inválido: use mentor ou mentorado",
    );
    expect(translateApiMessage("Role is not valid, use MENTOR or MENTEE")).toBe(
      "Papel inválido para esta mentoria: use mentor ou mentorado",
    );
  });

  it("papel complementar (mensagem com sufixo variável) é traduzido pelo prefixo", () => {
    expect(
      translateApiMessage("Role must be complementary to the creator role, use MENTOR"),
    ).toBe("O convite precisa ser para o papel complementar ao de quem criou a mentoria");
    expect(
      translateApiMessage("Role must be complementary to the creator role, use MENTEE"),
    ).toBe("O convite precisa ser para o papel complementar ao de quem criou a mentoria");
  });

  it("traduz as mensagens de perfil e visibilidade de contatos (plano 16)", () => {
    expect(translateApiMessage("description must have at most 500 characters")).toBe(
      "O resumo deve ter no máximo 500 caracteres",
    );
    expect(translateApiMessage("value must be a valid http or https url")).toBe(
      "Informe um link http(s) válido (ex.: https://exemplo.com)",
    );
    expect(translateApiMessage("value must have at most 500 characters")).toBe(
      "O link deve ter no máximo 500 caracteres",
    );
    expect(translateApiMessage("value must be a valid phone number")).toBe(
      "Informe um telefone válido (8 a 15 dígitos)",
    );
    expect(translateApiMessage("value must have at most 20 characters")).toBe(
      "O telefone deve ter no máximo 20 caracteres",
    );
    expect(translateApiMessage("shareWithCommunity requires a value")).toBe(
      "Para compartilhar com a comunidade, informe um valor",
    );
    expect(translateApiMessage("unsupported visibility key")).toBe(
      "Campo de contato não suportado",
    );
    expect(translateApiMessage("email value is managed by the system")).toBe(
      "O e-mail é gerenciado pelo sistema; só a visibilidade pode ser alterada",
    );
    expect(translateApiMessage("email and password cannot be changed by this endpoint")).toBe(
      "E-mail e senha não podem ser alterados por este endpoint",
    );
  });

  it("traduz as mensagens de quota e rate limit por usuário (plano 28)", () => {
    expect(translateApiMessage("owned communities limit reached")).toBe(
      "Você atingiu o limite de comunidades que pode criar",
    );
    expect(translateApiMessage("community memberships limit reached")).toBe(
      "Você atingiu o limite de comunidades das quais pode participar",
    );
    expect(translateApiMessage("pending events limit reached")).toBe(
      "Você atingiu o limite de eventos aguardando aprovação",
    );
    expect(translateApiMessage("active events limit reached")).toBe(
      "Você atingiu o limite de eventos ativos",
    );
    expect(translateApiMessage("skills limit reached")).toBe(
      "Você atingiu o limite de habilidades neste perfil",
    );
    expect(translateApiMessage("too many community creations")).toBe(
      "Muitas criações de comunidade. Aguarde e tente de novo",
    );
    expect(translateApiMessage("too many community joins")).toBe(
      "Muitas entradas em comunidades. Aguarde e tente de novo",
    );
    expect(translateApiMessage("too many event creations")).toBe(
      "Muitas criações de evento. Aguarde e tente de novo",
    );
  });

  it("traduz as mensagens da inbox (plano 21)", () => {
    expect(translateApiMessage("status must be unread, read or all")).toBe(
      "Status deve ser não lidas, lidas ou todas",
    );
    expect(translateApiMessage("id must be a positive integer")).toBe("Identificador inválido");
    expect(translateApiMessage("notification not found")).toBe("Notificação não encontrada");
  });
});

describe("fieldLabel", () => {
  it("traduz o campo conhecido e mantém o original quando desconhecido", () => {
    expect(fieldLabel("zip_code")).toBe("CEP");
    expect(fieldLabel("start_at")).toBe("Data de início");
    expect(fieldLabel("campo_novo")).toBe("campo_novo");
  });

  it("resolve as variantes camelCase dos causes e o campo body", () => {
    expect(fieldLabel("addressId")).toBe("Endereço");
    expect(fieldLabel("userId")).toBe("Usuário");
    expect(fieldLabel("body")).toBe("Formulário");
  });

  it("resolve os campos de recuperação de senha", () => {
    expect(fieldLabel("code")).toBe("Código");
    expect(fieldLabel("newPassword")).toBe("Nova senha");
    expect(fieldLabel("currentPassword")).toBe("Senha atual");
    expect(fieldLabel("comment")).toBe("Comentário");
  });

  it("resolve as chaves de contato de configVisibility (plano 16)", () => {
    expect(fieldLabel("config_visibility.github")).toBe("GitHub");
    expect(fieldLabel("config_visibility.github.value")).toBe("GitHub");
    expect(fieldLabel("config_visibility.otherlink")).toBe("Outro link");
    expect(fieldLabel("config_visibility.email")).toBe("E-mail");
    expect(fieldLabel("config_visibility.telegram")).toBe("telegram");
  });
});

describe("toUserMessages", () => {
  it("403 email is not verified usa a mesma frase do gate", () => {
    const result = toUserMessages(apiError(403, { message: "email is not verified", code: 403 }));
    expect(result.summary).toBe("Confirme seu e-mail para continuar");
  });

  it("429 de quota/rate usa a mensagem traduzida, sem causes", () => {
    const result = toUserMessages(
      apiError(429, { message: "owned communities limit reached", error: "too_many_requests", code: 429 }),
    );
    expect(result.summary).toBe("Você atingiu o limite de comunidades que pode criar");
    expect(result.fields).toEqual({});
  });

  it("corpo sem causes usa o summary do message", () => {
    const result = toUserMessages(apiError(400, { message: "Email already exists", code: 400 }));
    expect(result.summary).toBe("Este e-mail já está cadastrado");
    expect(result.fields).toEqual({});
    expect(result.raw?.message).toBe("Email already exists");
  });

  it("cause desconhecido mantém a mensagem original e o field original", () => {
    const result = toUserMessages(
      apiError(400, {
        message: "invalid data",
        causes: [{ field: "campo_novo", message: "Something brand new" }],
      }),
    );
    expect(result.fields).toEqual({ campo_novo: "Something brand new" });
  });

  it("cause conhecido é traduzido e o field vira rótulo pt-BR", () => {
    const result = toUserMessages(
      apiError(400, {
        message: "invalid data",
        causes: [{ field: "name", message: "Name is not valid" }],
      }),
    );
    expect(result.fields).toEqual({ name: "Nome inválido" });
    expect(fieldLabel("name")).toBe("Nome");
  });

  it("erro desconhecido (não axios) cai na mensagem genérica", () => {
    const result = toUserMessages(new Error("boom"));
    expect(result.summary).toBe("Não foi possível concluir a operação. Tente novamente.");
    expect(result.raw).toBeNull();
  });

  it("apiErrorFields ignora o summary e devolve só os campos", () => {
    const fields = apiErrorFields(
      apiError(400, {
        message: "invalid data",
        causes: [
          { field: "email", message: "Email is not valid" },
          { field: "password", message: "Password must be at least 6 characters long" },
        ],
      }),
    );
    expect(fields).toEqual({
      email: "E-mail inválido",
      password: "A senha deve ter ao menos 6 caracteres",
    });
  });
});

describe("hasApiMessage", () => {
  it("encontra a mensagem no corpo ou nos causes, ignorando a caixa", () => {
    expect(
      hasApiMessage(apiError(400, { message: "Skill already exists" }), "skill ALREADY exists"),
    ).toBe(true);
    expect(
      hasApiMessage(
        apiError(400, {
          message: "Invalid skill user data",
          causes: [{ field: "user_id", message: "User already has this skill" }],
        }),
        "user already has this skill",
      ),
    ).toBe(true);
  });

  it("não confunde mensagens diferentes nem erros não-axios", () => {
    expect(hasApiMessage(apiError(400, { message: "outra coisa" }), "skill already exists")).toBe(
      false,
    );
    expect(hasApiMessage(new Error("boom"), "skill already exists")).toBe(false);
  });
});
