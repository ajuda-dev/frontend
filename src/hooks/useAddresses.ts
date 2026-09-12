import { useCallback, useMemo, useState } from "react";
import { createAddress } from "../services/address";
import type { Address, RegisterAddressInput } from "../types/api";

const STORAGE_PREFIX = "ajudadev.addresses.";

export interface UseAddressesResult {
  addresses: Address[];
  save: (input: RegisterAddressInput) => Promise<Address>;
  findByKey: (input: RegisterAddressInput) => Address | null;
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function isAddress(value: unknown): value is Address {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Address>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.zip_code === "string" &&
    typeof candidate.city === "string" &&
    typeof candidate.state === "string"
  );
}

function readStoredAddresses(userId: string): Address[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAddress);
  } catch {
    return [];
  }
}

function writeStoredAddresses(userId: string, addresses: Address[]): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(addresses));
  } catch {
    // Sem localStorage o cache vive só em memória nesta sessão.
  }
}

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeZipCode(value: string | undefined): string {
  return normalize(value).replace(/\D/g, "");
}

// A chave inclui número e complemento: o backend trata cada variação como um
// endereço novo (unicidade por CEP + número + complemento).
function addressKey(input: RegisterAddressInput): string {
  return [
    normalizeZipCode(input.zip_code),
    normalize(input.number),
    normalize(input.complement),
  ].join("|");
}

function keyOf(address: Address): string {
  return addressKey({
    zip_code: address.zip_code,
    number: address.number ?? "",
    complement: address.complement,
  });
}

// O GET /v1/address existe, mas é um catálogo GLOBAL (a tabela addresses não tem
// user_id): não serve para listar "meus endereços". O cache local por usuário
// continua sendo essa lista; o endpoint só é usado para recuperar o id de um
// endereço que já existe (plano 15).
export function useAddresses(userId: string | null | undefined): UseAddressesResult {
  const [state, setState] = useState<{ userId: string | null; addresses: Address[] }>(() => ({
    userId: userId ?? null,
    addresses: userId ? readStoredAddresses(userId) : [],
  }));

  // Troca de usuário ajustada durante o render (estado derivado), sem efeito.
  if (state.userId !== (userId ?? null)) {
    setState({ userId: userId ?? null, addresses: userId ? readStoredAddresses(userId) : [] });
  }

  const addresses = state.addresses;

  const persist = useCallback(
    (next: Address[]) => {
      setState({ userId: userId ?? null, addresses: next });
      if (userId) writeStoredAddresses(userId, next);
    },
    [userId],
  );

  const findByKey = useCallback(
    (input: RegisterAddressInput) => {
      const key = addressKey(input);
      return addresses.find((address) => keyOf(address) === key) ?? null;
    },
    [addresses],
  );

  const save = useCallback(
    async (input: RegisterAddressInput) => {
      const created = await createAddress(input);
      const withoutDuplicate = addresses.filter((address) => address.id !== created.id);
      persist([...withoutDuplicate, created]);
      return created;
    },
    [addresses, persist],
  );

  return useMemo(() => ({ addresses, save, findByKey }), [addresses, save, findByKey]);
}
