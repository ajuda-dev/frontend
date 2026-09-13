import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { apiErrorBody, isApiError } from "../../services/api";
import { searchAddresses } from "../../services/address";
import type { Address } from "../../types/api";
import { apiErrorMessage } from "../../utils/apiError";
import { formatAddress, formatCep } from "../../utils/format";

type Mode = "new" | "saved";

interface AddressPickerProps {
  addresses: Address[];
  onSave: (input: { zip_code: string; number: string; complement?: string }) => Promise<Address>;
  findByKey: (input: {
    zip_code: string;
    number: string;
    complement?: string;
  }) => Address | null;
  findExisting: (input: {
    zip_code: string;
    number: string;
    complement?: string;
  }) => Promise<Address | null>;
  onAddress: (address: Address | null) => void;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function maskCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

// O register devolve 400 tanto para endereço duplicado quanto para CEP inexistente
// no ViaCEP; só o primeiro merece a mensagem de "já cadastrado".
function isDuplicateError(error: unknown): boolean {
  if (!isApiError(error) || error.response?.status !== 400) return false;
  const body = apiErrorBody(error);
  const messages = [body?.message, ...(body?.causes ?? []).map((cause) => cause.message)];
  return messages.some((message) => message?.trim().toLowerCase() === "address already exists");
}

export function AddressPicker({
  addresses,
  onSave,
  findByKey,
  findExisting,
  onAddress,
}: AddressPickerProps) {
  const fieldId = useId();
  const [mode, setMode] = useState<Mode>(addresses.length > 0 ? "saved" : "new");
  const [selectedId, setSelectedId] = useState(addresses[0]?.id ?? "");
  const [zipCode, setZipCode] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [zipError, setZipError] = useState<string | null>(null);
  const [numberError, setNumberError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Address[]>([]);
  const [saving, setSaving] = useState(false);

  const selected = addresses.find((address) => address.id === selectedId) ?? null;

  function handleSelectSaved(id: string) {
    setSelectedId(id);
    setNotice(null);
    setFormError(null);
    onAddress(addresses.find((address) => address.id === id) ?? null);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setNotice(null);
    setFormError(null);
    setSuggestions([]);
    if (next === "saved") {
      const fallback = addresses.find((address) => address.id === selectedId) ?? addresses[0] ?? null;
      setSelectedId(fallback?.id ?? "");
      onAddress(fallback);
    } else {
      onAddress(null);
    }
  }

  function handleSuggestion(address: Address) {
    setSuggestions([]);
    setFormError(null);
    setNotice(`Endereço selecionado: ${formatAddress(address)}`);
    onAddress(address);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);
    setSuggestions([]);

    const digits = onlyDigits(zipCode);
    const nextZipError = digits.length === 8 ? null : "Informe um CEP com 8 dígitos";
    const nextNumberError = number.trim() ? null : "Informe o número";
    setZipError(nextZipError);
    setNumberError(nextNumberError);
    if (nextZipError || nextNumberError) return;

    const input = { zip_code: digits, number: number.trim(), complement: complement.trim() };
    setSaving(true);
    try {
      // Buscar antes de criar: o GET /v1/address é global, então a consulta é sempre
      // por CEP exato (nunca por cidade) e o match é pela mesma chave do cache local.
      const existing = await findExisting(input);
      if (existing) {
        onAddress(existing);
        setNotice(`Este endereço já estava cadastrado — reaproveitado: ${formatAddress(existing)}`);
        return;
      }

      // Best-effort: se a busca falhar, o cadastro segue (o ViaCEP vem do POST).
      let sameCep: Address[] = [];
      try {
        sameCep = await searchAddresses({ zipCode: digits });
      } catch {
        sameCep = [];
      }
      if (sameCep.length > 0) {
        setSuggestions(sameCep);
        onAddress(null);
        return;
      }

      const created = await onSave(input);
      onAddress(created);
      setNotice(`Endereço confirmado: ${formatAddress(created)}`);
    } catch (error) {
      if (isDuplicateError(error)) {
        const cached = findByKey(input);
        if (cached) {
          onAddress(cached);
          setNotice(`Este endereço já estava salvo: ${formatAddress(cached)}`);
          return;
        }
        // Corrida entre a busca e o cadastro: o backend rejeitou, mas o endereço
        // pode ter sido criado no meio do caminho — tenta recuperar o id.
        const recovered = await findExisting(input);
        if (recovered) {
          onAddress(recovered);
          setNotice(
            `Este endereço já estava cadastrado — reaproveitado: ${formatAddress(recovered)}`,
          );
        } else {
          onAddress(null);
          setFormError(
            "Este endereço já está cadastrado, mas não está salvo neste navegador. " +
              "Informe um número ou complemento diferente para criar um novo endereço.",
          );
        }
      } else {
        onAddress(null);
        setFormError(apiErrorMessage(error));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "new" ? "primary" : "secondary"}
          onClick={() => switchMode("new")}
        >
          Novo endereço (CEP)
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "saved" ? "primary" : "secondary"}
          disabled={addresses.length === 0}
          onClick={() => switchMode("saved")}
        >
          Endereços salvos
        </Button>
      </div>

      {mode === "saved" ? (
        <Field label="Usar endereço salvo" htmlFor={`${fieldId}-saved`}>
          <Select
            id={`${fieldId}-saved`}
            value={selectedId}
            onChange={(event) => handleSelectSaved(event.target.value)}
          >
            {addresses.map((address) => (
              <option key={address.id} value={address.id}>
                {formatAddress(address)} · CEP {formatCep(address.zip_code)}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="CEP" htmlFor={`${fieldId}-zip`} error={zipError ?? undefined}>
              <Input
                id={`${fieldId}-zip`}
                name="zip_code"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="00000-000"
                value={zipCode}
                invalid={Boolean(zipError)}
                onChange={(event) => setZipCode(maskCep(event.target.value))}
              />
            </Field>

            <Field label="Número" htmlFor={`${fieldId}-number`} error={numberError ?? undefined}>
              <Input
                id={`${fieldId}-number`}
                name="number"
                value={number}
                invalid={Boolean(numberError)}
                onChange={(event) => setNumber(event.target.value)}
              />
            </Field>

            <Field label="Complemento" htmlFor={`${fieldId}-complement`} hint="Opcional">
              <Input
                id={`${fieldId}-complement`}
                name="complement"
                value={complement}
                onChange={(event) => setComplement(event.target.value)}
              />
            </Field>
          </div>

          <p className="text-ink-muted text-xs">
            Rua, cidade e UF são preenchidos pelo servidor a partir do CEP.
          </p>

          {suggestions.length > 0 ? (
            <div className="border-line flex flex-col gap-2 rounded border p-3">
              <p className="text-ink text-sm font-semibold">
                Endereços já cadastrados neste CEP
              </p>
              <ul className="flex flex-col gap-2">
                {suggestions.map((address) => (
                  <li key={address.id}>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSuggestion(address)}
                    >
                      {formatAddress(address)} · CEP {formatCep(address.zip_code)}
                    </Button>
                  </li>
                ))}
              </ul>
              <p className="text-ink-muted text-xs">
                Escolha um deles ou clique em "Buscar endereço" para cadastrar um novo.
              </p>
            </div>
          ) : null}

          <div>
            <Button type="submit" variant="secondary" loading={saving}>
              Buscar endereço
            </Button>
          </div>
        </form>
      )}

      {formError ? <Alert variant="error">{formError}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}

      {mode === "saved" && selected ? (
        <p className="text-ink-muted text-xs">
          {selected.street ? `${selected.street}, ${selected.number ?? "s/n"} · ` : ""}
          {selected.city}/{selected.state} · CEP {formatCep(selected.zip_code)}
        </p>
      ) : null}
    </div>
  );
}
