import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AddressPicker } from "../../components/address/AddressPicker";
import { EmailVerificationGate } from "../../components/auth/EmailVerificationGate";
import { CommunityPicker } from "../../components/community/CommunityPicker";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { Spinner } from "../../components/ui/Spinner";
import { Textarea } from "../../components/ui/Textarea";
import { useAuth } from "../../context/useAuth";
import { useAddresses } from "../../hooks/useAddresses";
import { useMemberships } from "../../hooks/useMemberships";
import { findCommunityById } from "../../services/community";
import { createEvent } from "../../services/event";
import { EVENT_CATEGORIES, EVENT_TYPES, CREATOR_ROLES } from "../../types/api";
import type { Address, Community, CreatorRole, EventCategory, EventType } from "../../types/api";
import { apiErrorDetail, apiErrorMessage, apiErrorFields } from "../../utils/apiError";
import { toDateTimeLocal } from "../../utils/format";
import {
  EVENT_CATEGORY_LABEL,
  EVENT_TYPE_LABEL,
  PARTICIPATION_ROLE_LABEL,
} from "../../utils/labels";

interface FieldErrors {
  title?: string;
  description?: string;
  category?: string;
  type?: string;
  start_at?: string;
  duration_min?: string;
  max_slots?: string;
  meeting_link?: string;
  address_id?: string;
  community_id?: string;
  creator_role?: string;
}

// `datetime-local` trabalha em hora local do navegador; o backend compara instantes,
// então o valor vai como ISO (UTC) e o `min` do input já bloqueia o passado.
function nowLocalInputValue(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

function startAtFromQuery(raw: string | null): string {
  const value = raw?.trim() ?? "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toDateTimeLocal(date);
}

function needsAddress(type: EventType): boolean {
  return type === "INPERSON" || type === "HYBRID";
}

function allowsMeetingLink(type: EventType): boolean {
  return type === "ONLINE" || type === "HYBRID";
}

function allowsMaxSlots(category: EventCategory): boolean {
  return category !== "MENTORING";
}

export function NewEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addresses = useAddresses(user?.id);
  const memberships = useMemberships(user?.id);

  const communityId = searchParams.get("community_id") ?? "";

  const [community, setCommunity] = useState<Community | null>(null);
  const [communityNotice, setCommunityNotice] = useState<string | null>(null);
  const [loadingCommunity, setLoadingCommunity] = useState(Boolean(communityId));

  useEffect(() => {
    if (!communityId) return;
    let active = true;
    findCommunityById(communityId)
      .then((found) => {
        if (!active) return;
        if (found) {
          setCommunity(found);
          return;
        }
        // 404: a comunidade saiu do ar. O vínculo é opcional, então avisa e segue.
        setCommunityNotice(
          "A comunidade informada não foi encontrada. O evento será criado sem vínculo.",
        );
      })
      .catch(() => {
        if (!active) return;
        setCommunityNotice("Não foi possível carregar a comunidade informada. Escolha outra abaixo.");
      })
      .finally(() => {
        if (active) setLoadingCommunity(false);
      });
    return () => {
      active = false;
    };
  }, [communityId]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EventCategory>("COMMUNITY_EVENT");
  const [creatorRole, setCreatorRole] = useState<CreatorRole>("MENTOR");
  const [type, setType] = useState<EventType>("ONLINE");
  const [startAt, setStartAt] = useState(() => startAtFromQuery(searchParams.get("start_at")));
  const [durationMin, setDurationMin] = useState("");
  const [maxSlots, setMaxSlots] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [address, setAddress] = useState<Address | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showAddress = needsAddress(type);
  const showMeetingLink = allowsMeetingLink(type);
  const showMaxSlots = allowsMaxSlots(category);
  // O dono da comunidade cria evento já publicado (event_service.go:99-108 só marca
  // PENDING para quem não é o responsável): o `owner` vem no CommunityDto das três
  // origens (busca por id, listagem e comunidades do usuário).
  const isCommunityOwner = Boolean(user && community?.owner?.id === user.id);
  // O `useMemberships` é cache local por usuário: aqui ele só decide mostrar o atalho
  // de entrar, nunca se o vínculo é aceito (quem decide isso é o backend).
  const isCommunityMember = Boolean(community && memberships.isMember(community.id));
  // O picker só oferece comunidades próprias ou em que já sou membro, então um vínculo
  // sem membership só chega aqui pelo link `?community_id=` — é o caso que o atalho atende.
  const isLinkedFromUrl = Boolean(communityId) && community?.id === communityId;
  const canJoinCommunity =
    Boolean(user?.id) && isLinkedFromUrl && !isCommunityOwner && !isCommunityMember;

  function handleTypeChange(next: EventType) {
    setType(next);
    // ONLINE nunca leva endereço: limpar evita enviar um id que o backend rejeita.
    if (!needsAddress(next)) setAddress(null);
    if (!allowsMeetingLink(next)) setMeetingLink("");
    setErrors((previous) => ({ ...previous, address_id: undefined, meeting_link: undefined }));
  }

  function handleCategoryChange(next: EventCategory) {
    setCategory(next);
    if (!allowsMaxSlots(next)) setMaxSlots("");
    // `creator_role` só vale em MENTORING: fora dela o valor volta ao padrão e a
    // chave não é enviada (o backend responde 400 se ela vier).
    if (next !== "MENTORING") setCreatorRole("MENTOR");
    setErrors((previous) => ({ ...previous, max_slots: undefined, creator_role: undefined }));
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!title.trim()) next.title = "Informe o título do evento";
    if (!description.trim()) next.description = "Informe a descrição do evento";

    if (!startAt) {
      next.start_at = "Informe a data e a hora do evento";
    } else if (new Date(startAt).getTime() <= Date.now()) {
      next.start_at = "A data do evento precisa ser no futuro";
    }

    const duration = Number(durationMin);
    if (!durationMin.trim() || !Number.isFinite(duration) || duration <= 0) {
      next.duration_min = "Informe uma duração maior que zero";
    }

    if (showMaxSlots && maxSlots.trim()) {
      const slots = Number(maxSlots);
      if (!Number.isInteger(slots) || slots <= 0) {
        next.max_slots = "Informe um número de vagas maior que zero";
      }
    }

    if (showAddress && !address) {
      next.address_id = "Busque ou selecione o endereço do evento";
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
      const created = await createEvent({
        title: title.trim(),
        description: description.trim(),
        category,
        type,
        start_at: new Date(startAt).toISOString(),
        duration_min: Number(durationMin),
        meeting_link: showMeetingLink ? meetingLink : "",
        max_slots: showMaxSlots && maxSlots.trim() ? Number(maxSlots) : null,
        community_id: community?.id,
        address_id: showAddress && address ? address.id : undefined,
        creator_role: category === "MENTORING" ? creatorRole : undefined,
      });
      // O 201 não traz owner/community/address aninhados: o detalhe busca pelo id.
      navigate(`/eventos/${created.id}`, { replace: true });
    } catch (error) {
      const fields = apiErrorFields(error);
      setErrors({
        title: fields.title,
        description: fields.description,
        category: fields.category,
        type: fields.type,
        start_at: fields.start_at,
        duration_min: fields.duration_min,
        max_slots: fields.max_slots,
        meeting_link: fields.meeting_link,
        address_id: fields.address_id,
        community_id: fields.community_id,
        creator_role: fields.creator_role,
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
      <PageHeader
        title="Novo evento"
        description="Descreva o encontro, escolha o formato e publique no catálogo. No padrão da plataforma, cada pessoa pode ter até 5 eventos aguardando aprovação e 20 eventos ativos — moderadores, administradores e a configuração do servidor podem ter limites diferentes."
      />

      <EmailVerificationGate>
        <div className="flex flex-col gap-6">
      <Card>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <h2 className="text-ink text-base font-semibold">Dados do evento</h2>

          <Field label="Título" htmlFor="title" error={errors.title}>
            <Input
              id="title"
              name="title"
              value={title}
              invalid={Boolean(errors.title)}
              onChange={(event) => setTitle(event.target.value)}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoria" htmlFor="category" error={errors.category}>
              <Select
                id="category"
                name="category"
                value={category}
                onChange={(event) => handleCategoryChange(event.target.value as EventCategory)}
              >
                {EVENT_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {EVENT_CATEGORY_LABEL[value]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Formato" htmlFor="type" error={errors.type}>
              <Select
                id="type"
                name="type"
                value={type}
                onChange={(event) => handleTypeChange(event.target.value as EventType)}
              >
                {EVENT_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {EVENT_TYPE_LABEL[value]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {category === "MENTORING" ? (
            <Alert variant="info" title="Mentoria 1:1">
              Você escolhe o seu papel: quem cria pode ser o mentor (padrão) ou o mentorado, e a
              outra pessoa é convidada com o papel complementar. A API mantém duas posições (mentor
              e mentorado).
            </Alert>
          ) : null}

          {category === "MENTORING" ? (
            <Field
              label="Meu papel nesta mentoria"
              htmlFor="creator_role"
              error={errors.creator_role}
              hint="O convidado entra no papel complementar."
            >
              <Select
                id="creator_role"
                name="creator_role"
                value={creatorRole}
                invalid={Boolean(errors.creator_role)}
                onChange={(event) => setCreatorRole(event.target.value as CreatorRole)}
              >
                {CREATOR_ROLES.map((value) => (
                  <option key={value} value={value}>
                    {PARTICIPATION_ROLE_LABEL[value]}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Data e hora" htmlFor="start_at" error={errors.start_at}>
              <Input
                id="start_at"
                name="start_at"
                type="datetime-local"
                min={nowLocalInputValue()}
                value={startAt}
                invalid={Boolean(errors.start_at)}
                onChange={(event) => setStartAt(event.target.value)}
              />
            </Field>

            <Field label="Duração (minutos)" htmlFor="duration_min" error={errors.duration_min}>
              <Input
                id="duration_min"
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

          {showMaxSlots ? (
            <Field
              label="Vagas"
              htmlFor="max_slots"
              error={errors.max_slots}
              hint={
                category === "COMMUNITY_EVENT"
                  ? "O palestrante confirmado ocupa uma vaga. Quem organiza não ocupa, a menos que também se inscreva. Ex.: 10 ouvintes + palestrante = 11 vagas. Deixe em branco para não limitar."
                  : "Deixe em branco para não limitar as vagas."
              }
            >
              <Input
                id="max_slots"
                name="max_slots"
                type="number"
                min={1}
                inputMode="numeric"
                value={maxSlots}
                invalid={Boolean(errors.max_slots)}
                onChange={(event) => setMaxSlots(event.target.value)}
              />
            </Field>
          ) : (
            <p className="text-ink-muted text-sm">
              Vaga única: a mentoria 1:1 tem sempre duas posições — a sua e a de quem for convidado.
            </p>
          )}

          {showMeetingLink ? (
            <Field
              label="Link do encontro"
              htmlFor="meeting_link"
              error={errors.meeting_link}
              hint="Opcional — pode ser divulgado depois."
            >
              <Input
                id="meeting_link"
                name="meeting_link"
                type="url"
                placeholder="https://"
                value={meetingLink}
                invalid={Boolean(errors.meeting_link)}
                onChange={(event) => setMeetingLink(event.target.value)}
              />
            </Field>
          ) : null}

          {!showAddress && errors.address_id ? (
            <p role="alert" className="text-danger text-xs">
              {errors.address_id}
            </p>
          ) : null}

          {formError ? (
            <Alert variant="error">
              {formError}
              {detail ? <span className="block text-xs">{detail}</span> : null}
            </Alert>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={submitting}>
              Criar evento
            </Button>
            <Link to="/eventos" className="text-brand text-sm hover:underline">
              Cancelar
            </Link>
          </div>
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-ink text-base font-semibold">Comunidade</h2>

        {communityNotice ? <Alert variant="info">{communityNotice}</Alert> : null}
        {errors.community_id ? <Alert variant="error">{errors.community_id}</Alert> : null}

        {community ? (
          <Alert variant="info">
            {isCommunityOwner
              ? "Você é o responsável por esta comunidade: o evento entra direto no catálogo, sem fila de aprovação."
              : "Só o responsável ou membros da comunidade podem criar eventos nela, e eventos criados por membros passam pela aprovação do responsável antes de aparecer no catálogo."}
          </Alert>
        ) : null}

        {community && canJoinCommunity ? (
          <EmailVerificationGate>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                loading={memberships.pendingId === community.id}
                onClick={() => void memberships.join(community.id)}
              >
                Entrar na comunidade
              </Button>
              <p className="text-ink-muted text-xs">
                É preciso ser membro para criar um evento nesta comunidade.
              </p>
            </div>
          </EmailVerificationGate>
        ) : null}

        {memberships.notice ? (
          <Alert variant={memberships.notice.tone === "error" ? "error" : "info"}>
            {memberships.notice.message}
          </Alert>
        ) : null}

        {/* O hook limpa o notice a cada join: notice presente = o último join não foi 201
            e já tem mensagem própria, então aqui só sobra o caso de sucesso. */}
        {isLinkedFromUrl && !isCommunityOwner && isCommunityMember && !memberships.notice ? (
          <Alert variant="success">Você é membro desta comunidade.</Alert>
        ) : null}

        {loadingCommunity ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : user?.id ? (
          <CommunityPicker userId={user.id} selected={community} onSelect={setCommunity} />
        ) : null}
      </Card>

      {showAddress ? (
        <Card className="flex flex-col gap-4">
          <h2 className="text-ink text-base font-semibold">Endereço do evento</h2>
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
      ) : null}
        </div>
      </EmailVerificationGate>
    </div>
  );
}
