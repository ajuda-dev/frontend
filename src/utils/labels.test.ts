import { describe, expect, it } from "vitest";
import {
  EVENT_CATEGORIES,
  EVENT_TYPES,
  PARTICIPATION_ROLES,
  PARTICIPATION_STATUSES,
  SKILL_LEVELS,
  USER_ROLES,
} from "../types/api";
import {
  EVENT_CATEGORY_LABEL,
  EVENT_TYPE_LABEL,
  PARTICIPATION_ROLE_LABEL,
  PARTICIPATION_STATUS_LABEL,
  SKILL_LEVEL_LABEL,
  USER_ROLE_LABEL,
} from "./labels";

describe("labels pt-BR", () => {
  it("cobre todos os cargos", () => {
    for (const role of USER_ROLES) expect(USER_ROLE_LABEL[role]).toBeTruthy();
    expect(USER_ROLE_LABEL.MODERATOR).toBe("Moderador");
  });

  it("cobre todas as categorias de evento", () => {
    for (const c of EVENT_CATEGORIES) expect(EVENT_CATEGORY_LABEL[c]).toBeTruthy();
    expect(EVENT_CATEGORY_LABEL.COMMUNITY_EVENT).toBe("Evento da comunidade");
    expect(EVENT_CATEGORY_LABEL.MENTORING).toBe("Mentoria 1:1");
  });

  it("cobre todos os formatos", () => {
    for (const t of EVENT_TYPES) expect(EVENT_TYPE_LABEL[t]).toBeTruthy();
    expect(EVENT_TYPE_LABEL.INPERSON).toBe("Presencial");
  });

  it("cobre todos os papéis de participação", () => {
    for (const r of PARTICIPATION_ROLES) expect(PARTICIPATION_ROLE_LABEL[r]).toBeTruthy();
    expect(PARTICIPATION_ROLE_LABEL.HOST).toBe("Anfitrião");
    expect(PARTICIPATION_ROLE_LABEL.MENTEE).toBe("Mentorado");
  });

  it("cobre todos os status de participação", () => {
    for (const s of PARTICIPATION_STATUSES) expect(PARTICIPATION_STATUS_LABEL[s]).toBeTruthy();
    expect(PARTICIPATION_STATUS_LABEL.REQUESTED).toBe("Pendente");
  });

  it("cobre todos os níveis de skill", () => {
    for (const l of SKILL_LEVELS) expect(SKILL_LEVEL_LABEL[l]).toBeTruthy();
    expect(SKILL_LEVEL_LABEL.WANT_TO_LEARN).toBe("Quero aprender");
  });
});
