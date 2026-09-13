import type { Address, Pageable, RegisterAddressInput, SearchAddressParams } from "../types/api";
import { api } from "./api";

// O GET /v1/address é um catálogo GLOBAL (a tabela addresses não tem user_id): não
// serve para listar "meus endereços". A UI só o consulta por zip_code exato — um
// filtro por cidade listaria logradouro/número/complemento de terceiros em massa.
export async function searchAddresses({
  zipCode,
  signal,
}: SearchAddressParams): Promise<Address[]> {
  const params: Record<string, string | number> = {
    zip_code: zipCode.replace(/\D/g, ""),
    page: 1,
    // Um CEP tem poucos endereços; se has_next vier verdadeiro a UI trabalha só com
    // os 50 primeiros (o match exato por número/complemento não depende da página).
    limit: 50,
  };
  const { data } = await api.get<Pageable<Address>>("/address", { params, signal });
  return data.data;
}

// O backend resolve o CEP no ViaCEP e devolve o endereço completo
// (street/city/state preenchidos por ele) — o browser nunca chama o ViaCEP.
export async function createAddress(input: RegisterAddressInput): Promise<Address> {
  const body: RegisterAddressInput = {
    zip_code: input.zip_code,
    number: input.number,
  };
  const complement = input.complement?.trim();
  if (complement) body.complement = complement;

  const { data } = await api.post<Address>("/address/register", body);
  return data;
}
