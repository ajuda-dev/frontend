import type { ConfigVisibility } from "../types/api";

export const CONTACT_KEYS = ["github", "linkedin", "otherlink", "photo", "phone"] as const;
export type ContactKey = (typeof CONTACT_KEYS)[number];

export const CONTACT_LABELS: Record<string, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  otherlink: "Outro link",
  photo: "Foto",
  phone: "Telefone",
  email: "E-mail",
};

export const CONTACT_VALUE_MAX_LENGTH = 500;
export const PHONE_MAX_LENGTH = 20;
export const PHONE_MIN_DIGITS = 8;
export const PHONE_MAX_DIGITS = 15;

const PHONE_REGEX = /^\+?[0-9()\-. ]+$/;
const LINK_KEYS: string[] = ["github", "linkedin", "otherlink"];

export function contactLabel(key: string): string {
  return CONTACT_LABELS[key] ?? key;
}

export function isContactLink(key: string, value: string): boolean {
  return LINK_KEYS.includes(key) || /^https?:\/\//.test(value);
}

export function contactEntries(config: ConfigVisibility): [string, string][] {
  return CONTACT_KEYS.filter((key) => (config[key]?.value ?? "").trim() !== "").map((key) => [
    key,
    config[key].value,
  ]);
}

// A foto é renderizada como imagem no avatar, não como link na lista de contatos.
export function photoUrl(config: ConfigVisibility): string | undefined {
  const value = (config.photo?.value ?? "").trim();
  return value === "" ? undefined : value;
}

export function contactEntriesWithoutPhoto(config: ConfigVisibility): [string, string][] {
  return contactEntries(config).filter(([key]) => key !== "photo");
}

export function hiddenContactKeys(config: ConfigVisibility): string[] {
  return CONTACT_KEYS.filter((key) => {
    const entry = config[key];
    return Boolean(entry) && entry.value.trim() !== "" && !entry.shareWithCommunity;
  });
}

export function contactFieldKey(field: string): string | null {
  const prefix = "config_visibility.";
  if (!field.startsWith(prefix)) return null;
  const key = field.slice(prefix.length).replace(/\.value$/, "");
  return key || null;
}

export function validateContactValue(key: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (key === "phone") {
    if (trimmed.length > PHONE_MAX_LENGTH) return "O telefone deve ter no máximo 20 caracteres";
    const digits = trimmed.replace(/\D/g, "");
    if (
      !PHONE_REGEX.test(trimmed) ||
      digits.length < PHONE_MIN_DIGITS ||
      digits.length > PHONE_MAX_DIGITS
    ) {
      return "Informe um telefone válido (8 a 15 dígitos)";
    }
    return null;
  }

  if (trimmed.length > CONTACT_VALUE_MAX_LENGTH) return "O link deve ter no máximo 500 caracteres";
  if (!isValidHttpUrl(trimmed)) return "Informe um link http(s) válido (ex.: https://exemplo.com)";
  return null;
}

// Espelho best-effort do isValidHTTPURL do backend: o servidor é a palavra final.
function isValidHttpUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname !== "";
}
