import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { AddressPicker } from "../address/AddressPicker";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { useAuth } from "../../context/useAuth";
import { useAddresses } from "../../hooks/useAddresses";
import type { Address } from "../../types/api";
import { apiErrorDetail, apiErrorFields, apiErrorMessage } from "../../utils/apiError";
import { formatAddress, formatCep } from "../../utils/format";

export interface CommunityFormValues {
  name: string;
  description: string;
  address_id: string;
}

interface CommunityFormProps {
  initialName?: string;
  initialDescription?: string;
  initialAddress?: Address | null;
  submitLabel: string;
  cancelTo: string;
  onSubmit: (values: CommunityFormValues) => Promise<void>;
}

interface FieldErrors {
  name?: string;
  description?: string;
  address_id?: string;
}

export function CommunityForm({
  initialName = "",
  initialDescription = "",
  initialAddress = null,
  submitLabel,
  cancelTo,
  onSubmit,
}: CommunityFormProps) {
  const { user } = useAuth();
  const addresses = useAddresses(user?.id);

  const [address, setAddress] = useState<Address | null>(initialAddress);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Informe o nome da comunidade";
    if (!description.trim()) next.description = "Informe a descrição da comunidade";
    if (!address) next.address_id = "Busque ou selecione um endereço";
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setDetail(null);

    const localErrors = validate();
    setErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        address_id: address?.id ?? "",
      });
    } catch (error) {
      const fields = apiErrorFields(error);
      setErrors({
        name: fields.name,
        description: fields.description,
        address_id: fields.address_id,
      });
      if (Object.keys(fields).length === 0) {
        setFormError(apiErrorMessage(error));
        setDetail(apiErrorDetail(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <h2 className="text-ink text-base font-semibold">Endereço</h2>
        {initialAddress && address?.id === initialAddress.id ? (
          <p className="text-ink-muted text-xs">
            Endereço atual: {formatAddress(initialAddress)} · CEP {formatCep(initialAddress.zip_code)}
          </p>
        ) : null}
        <AddressPicker
          onSave={addresses.save}
          findByKey={addresses.findByKey}
          findExisting={addresses.findExisting}
          onAddress={setAddress}
        />
        {errors.address_id ? (
          <p role="alert" className="text-danger text-xs">
            {errors.address_id}
          </p>
        ) : null}
      </Card>

      <Card>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <h2 className="text-ink text-base font-semibold">Dados da comunidade</h2>

          <Field label="Nome" htmlFor="name" error={errors.name}>
            <Input
              id="name"
              name="name"
              value={name}
              invalid={Boolean(errors.name)}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <Field
            label="Descrição"
            htmlFor="description"
            error={errors.description}
            hint="A descrição não pode ficar em branco."
          >
            <Textarea
              id="description"
              name="description"
              rows={4}
              value={description}
              invalid={Boolean(errors.description)}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>

          {formError ? (
            <Alert variant="error">
              {formError}
              {detail ? <span className="block text-xs">{detail}</span> : null}
            </Alert>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={submitting}>
              {submitLabel}
            </Button>
            <Link to={cancelTo} className="text-brand text-sm hover:underline">
              Cancelar
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
