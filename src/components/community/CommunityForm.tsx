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
import type { Address, CommunityLinks } from "../../types/api";
import { apiErrorDetail, apiErrorFields, apiErrorMessage } from "../../utils/apiError";
import {
  COMMUNITY_LINK_KEYS,
  CONTACT_VALUE_MAX_LENGTH,
  contactFieldKey,
  contactLabel,
  toCommunityLinks,
  validateContactValue,
  type CommunityLinkKey,
} from "../../utils/contacts";
import { formatAddress, formatCep } from "../../utils/format";

export interface CommunityFormValues {
  name: string;
  description: string;
  address_id: string;
  configVisibility?: CommunityLinks;
}

interface CommunityFormProps {
  initialName?: string;
  initialDescription?: string;
  initialAddress?: Address | null;
  initialLinks?: CommunityLinks;
  includeEmptyLinks?: boolean;
  submitLabel: string;
  cancelTo: string;
  onSubmit: (values: CommunityFormValues) => Promise<void>;
}

interface FieldErrors {
  name?: string;
  description?: string;
  address_id?: string;
  github?: string;
  linkedin?: string;
  otherlink?: string;
  photo?: string;
}

export function CommunityForm({
  initialName = "",
  initialDescription = "",
  initialAddress = null,
  initialLinks = {},
  includeEmptyLinks = false,
  submitLabel,
  cancelTo,
  onSubmit,
}: CommunityFormProps) {
  const { user } = useAuth();
  const addresses = useAddresses(user?.id);

  const [address, setAddress] = useState<Address | null>(initialAddress);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [github, setGithub] = useState(initialLinks.github?.value ?? "");
  const [linkedin, setLinkedin] = useState(initialLinks.linkedin?.value ?? "");
  const [otherlink, setOtherlink] = useState(initialLinks.otherlink?.value ?? "");
  const [photo, setPhoto] = useState(initialLinks.photo?.value ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Informe o nome da comunidade";
    if (!description.trim()) next.description = "Informe a descrição da comunidade";
    if (!address) next.address_id = "Busque ou selecione um endereço";
    const linkValues: Record<CommunityLinkKey, string> = { github, linkedin, otherlink, photo };
    for (const key of COMMUNITY_LINK_KEYS) {
      const message = validateContactValue(key, linkValues[key]);
      if (message) next[key] = message;
    }
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
      const configVisibility = toCommunityLinks(
        { github, linkedin, otherlink, photo },
        { includeEmpty: includeEmptyLinks },
      );
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        address_id: address?.id ?? "",
        ...(configVisibility ? { configVisibility } : {}),
      });
    } catch (error) {
      const fields = apiErrorFields(error);
      const next: FieldErrors = {
        name: fields.name,
        description: fields.description,
        address_id: fields.address_id,
      };
      for (const [field, message] of Object.entries(fields)) {
        const key = contactFieldKey(field);
        if (key && (COMMUNITY_LINK_KEYS as readonly string[]).includes(key)) {
          next[key as CommunityLinkKey] = message;
        }
      }
      setErrors(next);
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

          <div className="flex flex-col gap-3">
            <h3 className="text-ink text-sm font-semibold">Links públicos</h3>
            <p className="text-ink-muted text-xs">
              GitHub, LinkedIn, outro site e a foto ficam visíveis para qualquer pessoa autenticada.
            </p>
            {COMMUNITY_LINK_KEYS.map((key) => {
              const value = { github, linkedin, otherlink, photo }[key];
              const setValue = {
                github: setGithub,
                linkedin: setLinkedin,
                otherlink: setOtherlink,
                photo: setPhoto,
              }[key];
              return (
                <Field key={key} label={contactLabel(key)} htmlFor={key} error={errors[key]}>
                  <Input
                    id={key}
                    name={key}
                    type="text"
                    maxLength={CONTACT_VALUE_MAX_LENGTH}
                    value={value}
                    invalid={Boolean(errors[key])}
                    onChange={(event) => setValue(event.target.value)}
                  />
                </Field>
              );
            })}
          </div>

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
