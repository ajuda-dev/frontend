import type { Address, RegisterAddressInput } from "../types/api";
import { api } from "./api";

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
