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

  it("resolve as chaves de contato de configVisibility (plano 16)", () => {
    expect(fieldLabel("config_visibility.github")).toBe("GitHub");
    expect(fieldLabel("config_visibility.github.value")).toBe("GitHub");
    expect(fieldLabel("config_visibility.otherlink")).toBe("Outro link");
    expect(fieldLabel("config_visibility.email")).toBe("E-mail");
    expect(fieldLabel("config_visibility.telegram")).toBe("telegram");
  });
});

describe("toUserMessages", () => {
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
