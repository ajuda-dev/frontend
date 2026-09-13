export const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ' ]+$/;
export const NAME_MAX_LENGTH = 50;

export function validatePersonName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Informe seu nome";
  if (trimmed.length > NAME_MAX_LENGTH || !NAME_REGEX.test(trimmed)) return "Nome inválido";
  return null;
}
