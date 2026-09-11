import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { AddressPicker } from "../../components/address/AddressPicker";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Textarea } from "../../components/ui/Textarea";
import { useAuth } from "../../context/useAuth";
import { useAddresses } from "../../hooks/useAddresses";
import { createCommunity } from "../../services/community";
import type { Address } from "../../types/api";
import { apiErrorDetail, apiErrorMessage, apiErrorFields } from "../../utils/apiError";

interface FieldErrors {
  name?: string;
  description?: string;
}

export function NewCommunityPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const addresses = useAddresses(user?.id);

  const [address, setAddress] = useState<Address | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Informe o nome da comunidade";
    if (!description.trim()) next.description = "Informe a descrição da comunidade";
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setDetail(null);

    const localErrors = validate();
    setErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    if (!address) {
      setFormError("Busque ou selecione um endereço antes de criar a comunidade.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createCommunity({
        name: name.trim(),
        description: description.trim(),
        address_id: address.id,
      });
      navigate(`/comunidades/${created.id}`, { replace: true, state: { community: created } });
    } catch (error) {
      const fields = apiErrorFields(error);
      setErrors({ name: fields.name, description: fields.description });
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
      <PageHeader
        title="Nova comunidade"
        description="Cadastre o endereço e descreva a comunidade para publicá-la no catálogo."
      />

      <Card className="flex flex-col gap-4">
        <h2 className="text-ink text-base font-semibold">Endereço</h2>
        <AddressPicker
          addresses={addresses.addresses}
          onSave={addresses.save}
          findByKey={addresses.findByKey}
          onAddress={setAddress}
        />
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

          <Field label="Descrição" htmlFor="description" error={errors.description}>
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
              Criar comunidade
            </Button>
            <Link to="/comunidades" className="text-brand text-sm hover:underline">
              Cancelar
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
