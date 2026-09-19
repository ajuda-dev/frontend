import { useState } from "react";
import { createEvent } from "../../services/event";
import { addParticipant } from "../../services/eventUser";
import { CREATOR_ROLES } from "../../types/api";
import type { CreatorRole } from "../../types/api";
import { apiErrorDetail, apiErrorFields, apiErrorMessage } from "../../utils/apiError";
import { complementaryRole } from "../../utils/events";
import { PARTICIPATION_ROLE_LABEL } from "../../utils/labels";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";

interface ScheduleMentoringModalProps {
  person: { id: string; name: string };
  onClose: () => void;
  onScheduled: (eventId: string) => void;
}

interface FieldErrors {
  title?: string;
  description?: string;
  start_at?: string;
  duration_min?: string;
  meeting_link?: string;
  creator_role?: string;
}

const DESCRIPTION_MAX_LENGTH = 500;

// `datetime-local` trabalha em hora local do navegador; o backend compara instantes,
// então o valor vai como ISO (UTC) e o `min` do input já bloqueia o passado.
function nowLocalInputValue(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

// A API não tem endpoint de "pedido de mentoria": o 1:1 é um evento MENTORING que
// quem cria já ganha como participante confirmado, então marcar pelo perfil são
// dois passos — criar o evento e convidar a pessoa com o papel complementar.
export function ScheduleMentoringModal({ person, onClose, onScheduled }: ScheduleMentoringModalProps) {
  const [myRole, setMyRole] = useState<CreatorRole>("MENTOR");
  const [title, setTitle] = useState(`Mentoria 1:1 com ${person.name}`);
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [durationMin, setDurationMin] = useState("60");
  const [meetingLink, setMeetingLink] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // O 1:1 nasce no primeiro POST: se o convite falhar depois, o id fica guardado
  // para levar a pessoa até o evento criado em vez de deixar um 1:1 sem convite.
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<{ message: string; detail: string | null } | null>(
    null,
  );

  const inviteRole = complementaryRole(myRole);

  async function handleSubmit() {
    setFormError(null);
    setDetail(null);

    const localErrors: FieldErrors = {};
    if (!title.trim()) localErrors.title = "Informe o título do 1:1";
    if (description.trim().length > DESCRIPTION_MAX_LENGTH) {
      localErrors.description = "A descrição deve ter no máximo 500 caracteres";
    }

    if (!startAt) {
      localErrors.start_at = "Informe a data e a hora do 1:1";
    } else if (new Date(startAt).getTime() <= Date.now()) {
      localErrors.start_at = "A data precisa ser no futuro";
    }

    const duration = Number(durationMin);
    if (!durationMin.trim() || !Number.isFinite(duration) || duration <= 0) {
      localErrors.duration_min = "Informe uma duração maior que zero";
    }

    setErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    setSubmitting(true);
    let eventId: string | null = null;
    try {
      const created = await createEvent({
        title: title.trim(),
        description: description.trim(),
        category: "MENTORING",
        // O 1:1 nasce online: presencial/híbrido exigiria endereço com CEP (ViaCEP),
        // que não cabe neste atalho — o link do encontro pode ser combinado depois.
        type: "ONLINE",
        start_at: new Date(startAt).toISOString(),
        duration_min: duration,
        meeting_link: meetingLink,
        creator_role: myRole,
      });
      eventId = created.id;
      await addParticipant(created.id, { userId: person.id, role: inviteRole });
      onScheduled(created.id);
    } catch (error) {
      if (eventId) {
        setCreatedEventId(eventId);
        setInviteError({ message: apiErrorMessage(error), detail: apiErrorDetail(error) });
      } else {
        const fields = apiErrorFields(error);
        const mapped: FieldErrors = {
          title: fields.title,
          description: fields.description,
          start_at: fields.start_at,
          duration_min: fields.duration_min,
          meeting_link: fields.meeting_link,
          creator_role: fields.creator_role,
        };
        setErrors(mapped);
        if (!Object.values(mapped).some(Boolean)) {
          setFormError(apiErrorMessage(error));
          setDetail(apiErrorDetail(error));
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      title="Agendar mentoria 1:1"
      onClose={onClose}
      footer={
        createdEventId ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
            <Button onClick={() => onScheduled(createdEventId)}>Ir para o 1:1</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button loading={submitting} onClick={() => void handleSubmit()}>
              Agendar 1:1
            </Button>
          </>
        )
      }
    >
      {inviteError ? (
        <Alert
          variant="error"
          title={`O 1:1 foi criado, mas o convite para ${person.name} não foi enviado`}
        >
          {inviteError.message}
          {inviteError.detail ? <span className="block text-xs">{inviteError.detail}</span> : null}
          <span className="block">Você pode convidar {person.name} na página do 1:1.</span>
        </Alert>
      ) : (
        <div className="flex flex-col gap-4">
          <p>
            Você cria a mentoria e convida {person.name} como{" "}
            {PARTICIPATION_ROLE_LABEL[inviteRole].toLowerCase()}. O convite fica pendente até{" "}
            {person.name} aceitar.
          </p>

          <Field
            label="Meu papel nesta mentoria"
            htmlFor="mentoring-role"
            error={errors.creator_role}
            hint={`O convite para ${person.name} usa o papel complementar.`}
          >
            <Select
              id="mentoring-role"
              name="creator_role"
              value={myRole}
              invalid={Boolean(errors.creator_role)}
              onChange={(event) => setMyRole(event.target.value as CreatorRole)}
            >
              {CREATOR_ROLES.map((value) => (
                <option key={value} value={value}>
                  {PARTICIPATION_ROLE_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Título" htmlFor="mentoring-title" error={errors.title}>
            <Input
              id="mentoring-title"
              name="title"
              value={title}
              invalid={Boolean(errors.title)}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>

          <Field
            label="Mensagem"
            htmlFor="mentoring-description"
            error={errors.description}
            hint={`Opcional — vai na descrição do 1:1. ${description.trim().length}/${DESCRIPTION_MAX_LENGTH} caracteres`}
          >
            <Textarea
              id="mentoring-description"
              name="description"
              rows={3}
              maxLength={DESCRIPTION_MAX_LENGTH}
              value={description}
              invalid={Boolean(errors.description)}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Data e hora" htmlFor="mentoring-start-at" error={errors.start_at}>
              <Input
                id="mentoring-start-at"
                name="start_at"
                type="datetime-local"
                min={nowLocalInputValue()}
                value={startAt}
                invalid={Boolean(errors.start_at)}
                onChange={(event) => setStartAt(event.target.value)}
              />
            </Field>

            <Field
              label="Duração (minutos)"
              htmlFor="mentoring-duration"
              error={errors.duration_min}
            >
              <Input
                id="mentoring-duration"
                name="duration_min"
                type="number"
                min={1}
                inputMode="numeric"
                value={durationMin}
                invalid={Boolean(errors.duration_min)}
                onChange={(event) => setDurationMin(event.target.value)}
              />
            </Field>
          </div>

          <Field
            label="Link do encontro"
            htmlFor="mentoring-link"
            error={errors.meeting_link}
            hint="Opcional — pode ser divulgado depois."
          >
            <Input
              id="mentoring-link"
              name="meeting_link"
              type="url"
              placeholder="https://"
              value={meetingLink}
              invalid={Boolean(errors.meeting_link)}
              onChange={(event) => setMeetingLink(event.target.value)}
            />
          </Field>

          {formError ? (
            <Alert variant="error">
              {formError}
              {detail ? <span className="block text-xs">{detail}</span> : null}
            </Alert>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
