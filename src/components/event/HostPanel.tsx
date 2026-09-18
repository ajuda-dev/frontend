import { useState } from "react";
import { Link } from "react-router";
import type { UseParticipantsResult } from "../../hooks/useParticipants";
import type { EventItem, EventUser } from "../../types/api";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";
import { complementaryRole, isEventApproved } from "../../utils/events";
import {
  PARTICIPATION_ROLE_COLOR,
  PARTICIPATION_ROLE_LABEL,
  PARTICIPATION_STATUS_COLOR,
  PARTICIPATION_STATUS_LABEL,
} from "../../utils/labels";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { NoticeCard } from "../ui/NoticeCard";
import { Spinner } from "../ui/Spinner";
import { Textarea } from "../ui/Textarea";
import { AddPersonPicker } from "./AddPersonPicker";

interface HostPanelProps {
  event: EventItem;
  participation: UseParticipantsResult;
  currentUserId: string | null;
  canManage?: boolean;
}

const COMMENT_MAX = 500;

// Lista de participantes do evento. Quem gerencia (canManageEvent) vê convite/remoção;
// no 1:1 o convidado vê a mesma lista (papel + status) e aceita/recusa na própria linha.
export function HostPanel({
  event,
  participation,
  currentUserId,
  canManage = true,
}: HostPanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [rejectLocalError, setRejectLocalError] = useState<string | null>(null);
  const {
    participants,
    confirmedCount,
    loading,
    error,
    failure,
    isPending,
    remove,
    accept,
    reject,
    cancel,
    refetch,
    clearFailure,
  } = participation;

  const isMentoring = event.category === "MENTORING";
  const isCreator = currentUserId !== null && event.owner?.id === currentUserId;
  const maxSlots = event.max_slots ?? null;
  const approved = isEventApproved(event);
  // Quem criou a mentoria pode ser mentor ou mentorado; o convite vai sempre para
  // o papel complementar (o backend recusa o mesmo papel).
  const myRow = participants.find((entry) => entry.user_id === currentUserId) ?? null;
  const myRole = myRow?.role === "MENTOR" || myRow?.role === "MENTEE" ? myRow.role : null;
  const inviteRole = isMentoring ? complementaryRole(myRole ?? "MENTOR") : "SPEAKER";
  const inviteLabel = isMentoring
    ? `Convidar ${PARTICIPATION_ROLE_LABEL[inviteRole].toLowerCase()}`
    : "Adicionar palestrante";
  const counterpartConfirmed = participants.some(
    (entry) => entry.role === inviteRole && entry.status === "CONFIRMED",
  );
  const inviteBlocked = canManage && isMentoring && counterpartConfirmed;
  const actionFailure =
    failure && (failure.key.startsWith("remove:") || ["accept", "reject", "cancel"].includes(failure.key))
      ? failure
      : null;
  const detail = apiErrorDetail(error);
  const occupancy = maxSlots !== null ? ` ${confirmedCount} de ${maxSlots} vagas ocupadas.` : "";

  function openPicker() {
    clearFailure();
    setPickerOpen(true);
  }

  function closePicker() {
    setPickerOpen(false);
    clearFailure();
  }

  function openRejectForm() {
    setRejecting(true);
    setRejectComment("");
    setRejectLocalError(null);
  }

  function closeRejectForm() {
    setRejecting(false);
    setRejectComment("");
    setRejectLocalError(null);
  }

  async function confirmReject() {
    const trimmed = rejectComment.trim();
    if (!trimmed) {
      setRejectLocalError("Informe o motivo da recusa");
      return;
    }
    if (trimmed.length > COMMENT_MAX) {
      setRejectLocalError(`O comentário deve ter no máximo ${COMMENT_MAX} caracteres`);
      return;
    }
    setRejectLocalError(null);
    const ok = await reject(trimmed);
    if (ok) closeRejectForm();
  }

  function rowActions(entry: EventUser) {
    const self = entry.user_id === currentUserId;
    const removing = isPending(`remove:${entry.user_id}`);

    if (self && entry.status === "REQUESTED") {
      if (rejecting) {
        return (
          <div className="flex w-full flex-col gap-2 sm:w-72">
            <label htmlFor="reject-comment" className="text-ink text-sm font-medium">
              Motivo da recusa
            </label>
            <Textarea
              id="reject-comment"
              value={rejectComment}
              onChange={(event) => {
                setRejectComment(event.target.value);
                setRejectLocalError(null);
              }}
              maxLength={COMMENT_MAX}
              rows={3}
              placeholder="Explique brevemente por que não pode participar"
              invalid={Boolean(rejectLocalError)}
              disabled={isPending("reject")}
            />
            <p className="text-ink-muted text-xs">
              {rejectComment.trim().length}/{COMMENT_MAX}
            </p>
            {rejectLocalError ? <Alert variant="error">{rejectLocalError}</Alert> : null}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="danger"
                loading={isPending("reject")}
                onClick={() => void confirmReject()}
              >
                Confirmar recusa
              </Button>
              <Button size="sm" variant="ghost" disabled={isPending("reject")} onClick={closeRejectForm}>
                Voltar
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="ink-muted">Você</Badge>
          <Button size="sm" disabled={!approved} loading={isPending("accept")} onClick={() => void accept()}>
            Aceitar convite
          </Button>
          <Button size="sm" variant="ghost" loading={isPending("reject")} onClick={openRejectForm}>
            Recusar
          </Button>
        </div>
      );
    }

    if (self) {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="ink-muted">Você</Badge>
          {isMentoring && !isCreator && entry.status === "CONFIRMED" ? (
            <Button
              size="sm"
              variant="ghost"
              loading={isPending("cancel")}
              onClick={() => void cancel()}
            >
              Cancelar inscrição
            </Button>
          ) : null}
        </div>
      );
    }

    if (!canManage) {
      if (entry.user_id === event.owner?.id && isMentoring) {
        return <Badge tone="ink-muted">Criador do 1:1</Badge>;
      }
      return null;
    }

    if (entry.user_id === event.owner?.id && isMentoring) {
      return <Badge tone="ink-muted">Criador do 1:1</Badge>;
    }

    if (entry.status === "REQUESTED") {
      return (
        <Button size="sm" variant="ghost" loading={removing} onClick={() => void remove(entry.user_id)}>
          Cancelar convite
        </Button>
      );
    }

    if (entry.status === "CONFIRMED") {
      return (
        <Button size="sm" variant="ghost" loading={removing} onClick={() => void remove(entry.user_id)}>
          Remover
        </Button>
      );
    }

    return null;
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-ink text-base font-semibold">
            {!canManage ? "Participantes" : isCreator ? "Painel do anfitrião" : "Gestão do evento"}
          </h2>
          {canManage ? (
            <p className="text-ink-muted text-xs">
              {!isCreator
                ? "Você gerencia este evento como responsável pela comunidade ou pela moderação."
                : isMentoring
                  ? `Você é o ${PARTICIPATION_ROLE_LABEL[myRole ?? "MENTOR"].toLowerCase()} desta mentoria. Convide ${PARTICIPATION_ROLE_LABEL[inviteRole].toLowerCase()} para completar as vagas.`
                  : "Adicione palestrantes e acompanhe as inscrições do evento."}
              {occupancy}
            </p>
          ) : occupancy ? (
            <p className="text-ink-muted text-xs">{occupancy.trim()}</p>
          ) : null}
        </div>

        {canManage ? (
          <Button size="sm" onClick={openPicker} disabled={inviteBlocked}>
            {inviteLabel}
          </Button>
        ) : null}
      </div>

      {inviteBlocked ? (
        <p className="text-ink-muted text-sm">
          Mentoria já tem {PARTICIPATION_ROLE_LABEL[inviteRole].toLowerCase()} — não é possível
          convidar outro.
        </p>
      ) : null}

      {loading && participants.length === 0 ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : null}

      {error && participants.length === 0 ? (
        <Alert
          variant="error"
          title="Não foi possível carregar os participantes"
          action={
            <button type="button" onClick={refetch} className="text-brand text-sm hover:underline">
              Tentar novamente
            </button>
          }
        >
          {apiErrorMessage(error)}
          {detail ? <span className="block text-xs">{detail}</span> : null}
        </Alert>
      ) : null}

      {!loading && !error && participants.length === 0 ? (
        <p className="text-ink-muted text-sm">Nenhum participante ainda.</p>
      ) : null}

      {participants.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {participants.map((entry) => (
            <li
              key={entry.id}
              className="bg-surface border-line flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2"
            >
              <div className="flex flex-col gap-1">
                <Link
                  to={`/pessoas/${entry.user_id}`}
                  className="text-ink hover:text-brand text-sm font-medium"
                >
                  {entry.user?.name ?? "Participante"}
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={PARTICIPATION_ROLE_COLOR[entry.role]}>
                    {PARTICIPATION_ROLE_LABEL[entry.role]}
                  </Badge>
                  <Badge tone={PARTICIPATION_STATUS_COLOR[entry.status]}>
                    {PARTICIPATION_STATUS_LABEL[entry.status]}
                  </Badge>
                </div>
                {entry.comment ? (
                  entry.status === "REJECTED" ? (
                    <NoticeCard tone="danger" title="Motivo da recusa">
                      {entry.comment}
                    </NoticeCard>
                  ) : (
                    <p className="text-ink-muted text-xs whitespace-pre-line">{entry.comment}</p>
                  )
                ) : null}
              </div>

              {rowActions(entry)}
            </li>
          ))}
        </ul>
      ) : null}

      {!approved && myRow?.status === "REQUESTED" ? (
        <p className="text-ink-muted text-sm">
          As inscrições abrem quando o evento for aprovado pela comunidade.
        </p>
      ) : null}

      {actionFailure ? <Alert variant="error">{actionFailure.message}</Alert> : null}

      {pickerOpen ? (
        <AddPersonPicker
          participation={participation}
          inviteRole={inviteRole}
          onClose={closePicker}
        />
      ) : null}
    </section>
  );
}
