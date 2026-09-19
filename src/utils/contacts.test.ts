import { describe, expect, it } from "vitest";
import type { ConfigVisibility } from "../types/api";
import {
  COMMUNITY_LINK_KEYS,
  CONTACT_KEYS,
  communityLinkEntriesWithoutPhoto,
  contactEntries,
  contactEntriesWithoutPhoto,
  contactFieldKey,
  contactLabel,
  hiddenContactKeys,
  isContactLink,
  photoUrl,
  toCommunityLinks,
  validateContactValue,
} from "./contacts";

function config(entries: ConfigVisibility): ConfigVisibility {
  return entries;
}

describe("CONTACT_KEYS", () => {
  it("mantém a ordem canônica de exibição", () => {
    expect(CONTACT_KEYS).toEqual(["github", "linkedin", "otherlink", "photo", "phone"]);
  });
});

describe("COMMUNITY_LINK_KEYS", () => {
  it("são os links públicos da comunidade, sem telefone", () => {
    expect(COMMUNITY_LINK_KEYS).toEqual(["github", "linkedin", "otherlink", "photo"]);
  });
});

describe("contactLabel", () => {
  it("traduz as chaves conhecidas e mantém a original quando desconhecida", () => {
    expect(contactLabel("github")).toBe("GitHub");
    expect(contactLabel("otherlink")).toBe("Outro link");
    expect(contactLabel("email")).toBe("E-mail");
    expect(contactLabel("telegram")).toBe("telegram");
  });
});

describe("isContactLink", () => {
  it("trata as chaves de link e qualquer valor http(s) como link", () => {
    expect(isContactLink("github", "https://github.com/x")).toBe(true);
    expect(isContactLink("otherlink", "https://exemplo.com")).toBe(true);
    expect(isContactLink("photo", "https://exemplo.com/foto.png")).toBe(true);
    expect(isContactLink("phone", "11999999999")).toBe(false);
  });
});

describe("contactEntries", () => {
  it("filtra o e-mail e os valores vazios e ordena pela ordem canônica", () => {
    const entries = contactEntries(
      config({
        phone: { value: "11999999999", shareWithCommunity: true },
        email: { value: "lucas@ajudadev.dev", shareWithCommunity: true },
        github: { value: "https://github.com/lucas", shareWithCommunity: true },
        linkedin: { value: "   ", shareWithCommunity: false },
      }),
    );

    expect(entries).toEqual([
      ["github", "https://github.com/lucas"],
      ["phone", "11999999999"],
    ]);
  });

  it("config vazia devolve lista vazia", () => {
    expect(contactEntries({})).toEqual([]);
  });
});

describe("photoUrl", () => {
  it("devolve a URL da foto quando existe", () => {
    expect(photoUrl({ photo: { value: "https://exemplo.com/foto.png", shareWithCommunity: true } })).toBe(
      "https://exemplo.com/foto.png",
    );
  });

  it("devolve undefined para valor vazio, só espaços ou chave ausente", () => {
    expect(photoUrl({ photo: { value: "", shareWithCommunity: false } })).toBeUndefined();
    expect(photoUrl({ photo: { value: "   ", shareWithCommunity: true } })).toBeUndefined();
    expect(photoUrl({})).toBeUndefined();
  });
});

describe("contactEntriesWithoutPhoto", () => {
  it("remove a foto da lista de contatos e mantém a ordem canônica", () => {
    const entries = contactEntriesWithoutPhoto({
      photo: { value: "https://exemplo.com/foto.png", shareWithCommunity: true },
      github: { value: "https://github.com/lucas", shareWithCommunity: true },
      phone: { value: "11999999999", shareWithCommunity: true },
    });

    expect(entries).toEqual([
      ["github", "https://github.com/lucas"],
      ["phone", "11999999999"],
    ]);
  });
});

describe("hiddenContactKeys", () => {
  it("só considera entradas com valor e não compartilhadas", () => {
    const keys = hiddenContactKeys(
      config({
        github: { value: "https://github.com/lucas", shareWithCommunity: false },
        linkedin: { value: "https://linkedin.com/in/lucas", shareWithCommunity: true },
        phone: { value: "", shareWithCommunity: false },
        email: { value: "lucas@ajudadev.dev", shareWithCommunity: false },
      }),
    );

    expect(keys).toEqual(["github"]);
  });

  it("ignora chaves desconhecidas", () => {
    expect(hiddenContactKeys(config({ telegram: { value: "@lucas", shareWithCommunity: false } }))).toEqual(
      [],
    );
  });
});

describe("contactFieldKey", () => {
  it("mapeia as causes do backend para a chave do formulário", () => {
    expect(contactFieldKey("config_visibility.github.value")).toBe("github");
    expect(contactFieldKey("config_visibility.email")).toBe("email");
    expect(contactFieldKey("config_visibility.phone")).toBe("phone");
  });

  it("devolve null para campos que não são de contato", () => {
    expect(contactFieldKey("description")).toBeNull();
    expect(contactFieldKey("config_visibility.")).toBeNull();
  });
});

describe("validateContactValue", () => {
  it("aceita URL http(s) com host", () => {
    expect(validateContactValue("github", "https://github.com/x")).toBeNull();
    expect(validateContactValue("otherlink", "http://exemplo.com")).toBeNull();
  });

  it("recusa URL sem scheme ou sem host", () => {
    expect(validateContactValue("github", "github.com")).toBe(
      "Informe um link http(s) válido (ex.: https://exemplo.com)",
    );
    expect(validateContactValue("otherlink", "https://")).toBe(
      "Informe um link http(s) válido (ex.: https://exemplo.com)",
    );
  });

  it("recusa link acima de 500 caracteres", () => {
    const long = `https://exemplo.com/${"a".repeat(500)}`;
    expect(validateContactValue("github", long)).toBe("O link deve ter no máximo 500 caracteres");
  });

  it("valor vazio é válido (limpar o contato)", () => {
    expect(validateContactValue("github", "")).toBeNull();
    expect(validateContactValue("phone", "   ")).toBeNull();
  });

  it("telefone conta dígitos, não caracteres", () => {
    expect(validateContactValue("phone", "1234567")).toBe("Informe um telefone válido (8 a 15 dígitos)");
    expect(validateContactValue("phone", "(11) 99999-9999")).toBeNull();
    expect(validateContactValue("phone", "+55 11 99999-9999")).toBeNull();
    expect(validateContactValue("phone", "1199999999999999")).toBe(
      "Informe um telefone válido (8 a 15 dígitos)",
    );
  });

  it("recusa telefone com caracteres não permitidos", () => {
    expect(validateContactValue("phone", "1199999999a")).toBe(
      "Informe um telefone válido (8 a 15 dígitos)",
    );
  });

  it("recusa telefone acima de 20 caracteres", () => {
    expect(validateContactValue("phone", "(11) 99999-9999 ramal 12")).toBe(
      "O telefone deve ter no máximo 20 caracteres",
    );
  });
});

describe("communityLinkEntriesWithoutPhoto", () => {
  it("lista só os links da comunidade, sem foto", () => {
    expect(
      communityLinkEntriesWithoutPhoto({
        github: { value: "https://github.com/org" },
        photo: { value: "https://exemplo.com/foto.png" },
        phone: { value: "11999999999" },
      }),
    ).toEqual([["github", "https://github.com/org"]]);
  });
});

describe("toCommunityLinks", () => {
  it("omite chaves vazias no cadastro", () => {
    expect(
      toCommunityLinks({
        github: "https://github.com/org",
        linkedin: "  ",
        otherlink: "",
        photo: "",
      }),
    ).toEqual({ github: { value: "https://github.com/org" } });
  });

  it("devolve undefined quando nada foi preenchido", () => {
    expect(toCommunityLinks({ github: "", linkedin: "", otherlink: "", photo: "" })).toBeUndefined();
  });

  it("na edição inclui vazios para limpar o valor no servidor", () => {
    expect(
      toCommunityLinks(
        { github: "", linkedin: "https://linkedin.com/company/org", otherlink: "", photo: "" },
        { includeEmpty: true },
      ),
    ).toEqual({
      github: { value: "" },
      linkedin: { value: "https://linkedin.com/company/org" },
      otherlink: { value: "" },
      photo: { value: "" },
    });
  });
});
