const APP_TIME_ZONE = "America/Sao_Paulo";

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(iso));
}

export function formatCep(cep: string): string {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return cep;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

interface AddressLike {
  street?: string;
  number?: string;
  complement?: string;
  city: string;
  state: string;
}

export function formatAddress(address: AddressLike | null | undefined): string {
  if (!address) return "";
  const logradouro = [address.street, address.number].filter(Boolean).join(", ");
  const local = [logradouro, address.complement].filter(Boolean).join(" — ");
  return local ? `${local} · ${address.city}/${address.state}` : `${address.city}/${address.state}`;
}
