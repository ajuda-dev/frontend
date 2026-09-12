import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { apiErrorBody, isApiError } from "../../services/api";
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

export function AddressPicker({ addresses, onSave, findByKey, onAddress }: AddressPickerProps) {
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
    if (next === "saved") {
      const fallback = addresses.find((address) => address.id === selectedId) ?? addresses[0] ?? null;
      setSelectedId(fallback?.id ?? "");
      onAddress(fallback);
    } else {
      onAddress(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);

    const digits = onlyDigits(zipCode);
    const nextZipError = digits.length === 8 ? null : "Informe um CEP com 8 dígitos";
    const nextNumberError = number.trim() ? null : "Informe o número";
    setZipError(nextZipError);
    setNumberError(nextNumberError);
    if (nextZipError || nextNumberError) return;

    const input = { zip_code: digits, number: number.trim(), complement: complement.trim() };
    setSaving(true);
    try {
      const created = await onSave(input);
      onAddress(created);
      setNotice(`Endereço confirmado: ${formatAddress(created)}`);
    } catch (error) {
      if (isDuplicateError(error)) {
        const cached = findByKey(input);
        if (cached) {
          onAddress(cached);
          setNotice(`Este endereço já estava salvo: ${formatAddress(cached)}`);
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
