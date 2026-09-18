import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { HostPanel } from "../../components/event/HostPanel";
import { EventApprovalBadge } from "../../components/event/EventApprovalBadge";
import { EventApprovalControls } from "../../components/event/EventApprovalControls";
import { ParticipationZone } from "../../components/event/ParticipationZone";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { NoticeCard } from "../../components/ui/NoticeCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageSpinner } from "../../components/ui/Spinner";
import { Textarea } from "../../components/ui/Textarea";
import { useAuth } from "../../context/useAuth";
import { useParticipants } from "../../hooks/useParticipants";
import { deleteEvent, findEventById, rescheduleEvent } from "../../services/event";
import { isApiError } from "../../services/api";
import type { EventItem } from "../../types/api";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";
import { canManageEvent, canRescheduleEvent, isEventApproved } from "../../utils/events";
import { formatAddress, formatDateTime } from "../../utils/format";
import { EVENT_CATEGORY_COLOR, EVENT_CATEGORY_LABEL, EVENT_TYPE_LABEL } from "../../utils/labels";
import { canAtLeast } from "../../utils/roles";

interface DetailLocationState {
  event?: EventItem;
}

const COMMENT_MAX = 500;

// `datetime-local` trabalha em hora local do navegador; o backend compara instantes,
// então o valor vai como ISO (UTC) e o `min` do input já bloqueia o passado.
function toLocalInputValue(value: Date): string {
  const offsetMs = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offsetMs).toISOString().slice(0, 16);
}

function nowLocalInputValue(): string {
  return toLocalInputValue(new Date());
}

export function EventDetailPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const fromList = (location.state as DetailLocationState | null)?.event;
  const [event, setEvent] = useState<EventItem | null>(
    fromList && fromList.id === id ? fromList : null,
  );
  const [loading, setLoading] = useState(!event);
  const eventRef = useRef<EventItem | null>(fromList && fromList.id === id ? fromList : null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteComment, setDeleteComment] = useState("");
  const [deleteLocalError, setDeleteLocalError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmingReschedule, setConfirmingReschedule] = useState(false);
  const [rescheduleStartAt, setRescheduleStartAt] = useState("");
  const [rescheduleComment, setRescheduleComment] = useState("");
  const [rescheduleLocalError, setRescheduleLocalError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  useEffect(() => {
    eventRef.current = event;
  }, [event]);

  useEffect(() => {
    // O state da lista é só um snapshot: start_at e comment mudam no reagendamento
    // e a outra pessoa ainda veria o texto velho se o GET fosse pulado.
    const controller = new AbortController();
    const run = async () => {
      const hasSnapshot = eventRef.current != null;
      if (!hasSnapshot) {
        setLoading(true);
        setError(null);
      }
      try {
        const found = await findEventById(id, controller.signal);
        if (controller.signal.aborted) return;
        if (found) {
          setEvent(found);
          setError(null);
        } else if (found === null) {
          setEvent(null);
        }
      } catch (caught) {
        if (controller.signal.aborted) return;
        if (!eventRef.current) setError(caught);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void run();
    return () => controller.abort();
  }, [id, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  // Após mutações de participação as vagas podem mudar: recarrega o evento em
  // silêncio (a lista de participantes continua sendo a fonte da contagem).
  const refreshEvent = useCallback(() => {
    void findEventById(id)
      .then((found) => {
        if (found) setEvent(found);
      })
      .catch(() => {});
  }, [id]);

  const participation = useParticipants(event?.id ?? "", user?.id, refreshEvent);
  const refetchParticipants = participation.refetch;

  const openDeleteModal = useCallback(() => {
    setConfirmingDelete(true);
    setDeleteComment("");
    setDeleteLocalError(null);
    setDeleteError(null);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (deleting) return;
    setConfirmingDelete(false);
    setDeleteComment("");
    setDeleteLocalError(null);
  }, [deleting]);

  const openRescheduleModal = useCallback(() => {
    if (!event) return;
    const parsed = new Date(event.start_at);
    setConfirmingReschedule(true);
    setRescheduleStartAt(
      Number.isNaN(parsed.getTime()) ? nowLocalInputValue() : toLocalInputValue(parsed),
    );
    setRescheduleComment("");
    setRescheduleLocalError(null);
    setRescheduleError(null);
  }, [event]);

  const closeRescheduleModal = useCallback(() => {
    if (rescheduling) return;
    setConfirmingReschedule(false);
    setRescheduleComment("");
    setRescheduleLocalError(null);
  }, [rescheduling]);

  const handleReschedule = useCallback(async () => {
    if (!rescheduleStartAt) {
      setRescheduleLocalError("Informe a data e a hora do evento");
      return;
    }
    if (new Date(rescheduleStartAt).getTime() <= Date.now()) {
      setRescheduleLocalError("A data do evento precisa ser no futuro");
      return;
    }
    const trimmed = rescheduleComment.trim();
    if (!trimmed) {
      setRescheduleLocalError("Informe o motivo do reagendamento");
      return;
    }
    if (trimmed.length > COMMENT_MAX) {
      setRescheduleLocalError(`O comentário deve ter no máximo ${COMMENT_MAX} caracteres`);
      return;
    }
    setRescheduling(true);
    setRescheduleError(null);
    setRescheduleLocalError(null);
    try {
      const updated = await rescheduleEvent(id, {
        startAt: new Date(rescheduleStartAt).toISOString(),
        comment: trimmed,
      });
      setEvent(updated);
      refetchParticipants();
      setConfirmingReschedule(false);
      setRescheduleComment("");
    } catch (caught) {
      setRescheduleError(apiErrorMessage(caught));
    } finally {
      setRescheduling(false);
    }
  }, [id, refetchParticipants, rescheduleComment, rescheduleStartAt]);

  const handleDelete = useCallback(async () => {
    const trimmed = deleteComment.trim();
    if (!trimmed) {
      setDeleteLocalError("Informe o motivo do cancelamento");
      return;
    }
    if (trimmed.length > COMMENT_MAX) {
      setDeleteLocalError(`O comentário deve ter no máximo ${COMMENT_MAX} caracteres`);
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    setDeleteLocalError(null);
    try {
      await deleteEvent(id, trimmed);
      navigate("/eventos", { replace: true });
    } catch (caught) {
      setConfirmingDelete(false);
      // 404 = já removido: o resultado desejado foi alcançado, então volta para a lista.
      if (isApiError(caught) && caught.response?.status === 404) {
        navigate("/eventos", { replace: true });
        return;
      }
      setDeleteError(apiErrorMessage(caught));
    } finally {
      setDeleting(false);
    }
  }, [deleteComment, id, navigate]);

  if (loading) return <PageSpinner />;

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Evento" />
        <Alert
          variant="error"
          title="Não foi possível carregar o evento"
          action={
            <button type="button" onClick={retry} className="text-brand text-sm hover:underline">
              Tentar novamente
            </button>
          }
        >
          {apiErrorMessage(error)}
          {apiErrorDetail(error) ? (
            <span className="block text-xs">{apiErrorDetail(error)}</span>
          ) : null}
        </Alert>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Evento" />
        <EmptyState
          title="Evento não encontrado ou removido."
          description="O endereço acessado não corresponde a nenhum evento do catálogo."
          action={
            <Link to="/eventos" className="text-brand text-sm hover:underline">
              Voltar para a lista
            </Link>
          }
        />
      </div>
    );
  }

  const isOwner = Boolean(user && event.owner && event.owner.id === user.id);
  const isOnline = event.type === "ONLINE";
  // Espelha canManageEvent do backend: criador, dono da comunidade ou ≥ MODERATOR.
  const canManage = canManageEvent(event, user);
  const canDelete = canManage;
  const canReschedule = canRescheduleEvent(event, user, participation.myRow);
  const isMentoring = event.category === "MENTORING";
  // No 1:1 os dois lados veem a mesma lista (papel + status). Aceitar/recusar
  // fica na linha do convidado; a zona de participação só cobre comunidade e
  // quem abriu um 1:1 sem convite.
  const mentoringListVisible =
    isMentoring && (canManage || participation.loading || Boolean(participation.myRow));
  const showHostPanel = canManage || mentoringListVisible;
  const showZone = isMentoring ? !mentoringListVisible : true;
  // Espelha canApproveEvent do backend: dono da comunidade ou ≥ MODERATOR — o criador
  // do evento não aprova, nem quando é membro da comunidade.
  const isCommunityOwner = Boolean(
    user && event.community?.owner && event.community.owner.id === user.id,
  );
  const canApprove = isCommunityOwner || canAtLeast(user?.role, "MODERATOR");
  const approved = isEventApproved(event);
  const showApprovalPanel = canApprove && !approved;
  const showCreatorNotice = isOwner && !canApprove && !approved;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={event.title}
        description={formatDateTime(event.start_at)}
        actions={isOwner ? <Badge tone="brand">Você organiza</Badge> : null}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={EVENT_CATEGORY_COLOR[event.category]}>
          {EVENT_CATEGORY_LABEL[event.category]}
        </Badge>
        <Badge tone="ink-muted">{EVENT_TYPE_LABEL[event.type]}</Badge>
        <EventApprovalBadge event={event} />
      </div>

      <Card className="flex flex-col gap-4">
        <p className="text-ink text-sm whitespace-pre-line">{event.description}</p>

        <dl className="text-ink-muted grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs">Data e hora</dt>
            <dd className="text-ink">{formatDateTime(event.start_at)}</dd>
          </div>
          <div>
            <dt className="text-xs">Duração</dt>
            <dd className="text-ink">{event.duration_min} min</dd>
          </div>
          <div>
            <dt className="text-xs">Local</dt>
            <dd className="text-ink">
              {isOnline
                ? "Online"
                : event.address
                  ? formatAddress(event.address)
                  : "Local a confirmar"}
            </dd>
          </div>
          <div>
            <dt className="text-xs">Organizado por</dt>
            <dd className="text-ink">{event.owner?.name ?? "responsável não informado"}</dd>
          </div>
          {event.max_slots ? (
            <div>
              <dt className="text-xs">Vagas</dt>
              <dd className="text-ink">{event.max_slots}</dd>
            </div>
          ) : null}
        </dl>

        {isOnline ? (
          event.meeting_link ? (
            <a
              href={event.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand text-sm hover:underline"
            >
              Acessar link da reunião
            </a>
          ) : (
            <p className="text-ink-muted text-sm">Evento online — link será divulgado.</p>
          )
        ) : null}

        {event.community ? (
          <Link
            to={`/comunidades/${event.community.id}`}
            state={{ community: event.community }}
            className="text-brand text-sm hover:underline"
          >
            Comunidade: {event.community.name}
          </Link>
        ) : null}
      </Card>

      {event.comment ? (
        <NoticeCard
          tone="warning"
          title={event.category === "MENTORING" ? "Mentoria reagendada" : "Evento reagendado"}
        >
          {event.comment}
        </NoticeCard>
      ) : null}

      {showApprovalPanel ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-ink text-base font-semibold">Aprovação do evento</h2>
          <Alert variant="info">
            {event.status === "REJECTED"
              ? "Este evento foi rejeitado e não aparece no catálogo. Aprovar libera a inscrição e a visibilidade para todos."
              : "Este evento aguarda aprovação: enquanto isso ele fica oculto para quem não gerencia a comunidade e a inscrição está bloqueada."}
          </Alert>
          <EventApprovalControls event={event} onDecided={setEvent} />
        </Card>
      ) : null}

      {showCreatorNotice ? (
        <Alert variant="info" title="Aguardando aprovação">
          {event.status === "REJECTED"
            ? "Este evento foi rejeitado pelo responsável pela comunidade e não aparece no catálogo. Só quem gerencia a comunidade pode aprová-lo de novo — não existe edição de evento na API."
            : "O responsável pela comunidade ainda não liberou este evento. Ele aparece para você, para quem gerencia a comunidade e na sua agenda, mas fica oculto para os demais até ser aprovado."}
        </Alert>
      ) : null}

      {showHostPanel ? (
        <HostPanel
          event={event}
          participation={participation}
          currentUserId={user?.id ?? null}
          canManage={canManage}
        />
      ) : null}

      {showZone ? <ParticipationZone event={event} participation={participation} /> : null}

      {deleteError ? <Alert variant="error">{deleteError}</Alert> : null}

      {canReschedule || canDelete ? (
        <div className="flex flex-wrap items-center gap-3">
          {canReschedule ? (
            <Button variant="secondary" onClick={openRescheduleModal}>
              Reagendar
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="danger" onClick={openDeleteModal}>
              Excluir evento
            </Button>
          ) : null}
        </div>
      ) : null}

      <Modal
        open={confirmingReschedule}
        title="Reagendar evento"
        onClose={closeRescheduleModal}
        footer={
          <>
            <Button variant="ghost" onClick={closeRescheduleModal} disabled={rescheduling}>
              Cancelar
            </Button>
            <Button onClick={() => void handleReschedule()} loading={rescheduling}>
              Confirmar reagendamento
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {event.category === "MENTORING" ? (
            <p>Ao reagendar, você confirma o novo horário. A outra pessoa precisa aceitar de novo.</p>
          ) : null}
          <label htmlFor="reschedule-start-at" className="text-ink text-sm font-medium">
            Nova data e hora
          </label>
          <Input
            id="reschedule-start-at"
            type="datetime-local"
            min={nowLocalInputValue()}
            value={rescheduleStartAt}
            onChange={(change) => {
              setRescheduleStartAt(change.target.value);
              setRescheduleLocalError(null);
            }}
            invalid={Boolean(rescheduleLocalError)}
            disabled={rescheduling}
          />
          <label htmlFor="reschedule-event-comment" className="text-ink text-sm font-medium">
            Motivo do reagendamento
          </label>
          <Textarea
            id="reschedule-event-comment"
            value={rescheduleComment}
            onChange={(change) => {
              setRescheduleComment(change.target.value);
              setRescheduleLocalError(null);
            }}
            maxLength={COMMENT_MAX}
            rows={3}
            placeholder="Explique brevemente o motivo"
            invalid={Boolean(rescheduleLocalError)}
            disabled={rescheduling}
          />
          <p className="text-ink-muted text-xs">
            {rescheduleComment.trim().length}/{COMMENT_MAX}
          </p>
          {rescheduleLocalError ? <Alert variant="error">{rescheduleLocalError}</Alert> : null}
          {rescheduleError ? <Alert variant="error">{rescheduleError}</Alert> : null}
        </div>
      </Modal>

      <Modal
        open={confirmingDelete}
        title="Excluir evento"
        onClose={closeDeleteModal}
        footer={
          <>
            <Button variant="ghost" onClick={closeDeleteModal} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => void handleDelete()} loading={deleting}>
              Excluir
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>
            {isOwner
              ? "Excluir evento? Esta ação não pode ser desfeita."
              : "Você está excluindo um evento que não é seu (você gerencia a comunidade ou a moderação). Esta ação não pode ser desfeita."}
          </p>
          <label htmlFor="delete-event-comment" className="text-ink text-sm font-medium">
            Motivo do cancelamento
          </label>
          <Textarea
            id="delete-event-comment"
            value={deleteComment}
            onChange={(change) => {
              setDeleteComment(change.target.value);
              setDeleteLocalError(null);
            }}
            maxLength={COMMENT_MAX}
            rows={3}
            placeholder="Explique brevemente o motivo"
            invalid={Boolean(deleteLocalError)}
            disabled={deleting}
          />
          <p className="text-ink-muted text-xs">
            {deleteComment.trim().length}/{COMMENT_MAX}
          </p>
          {deleteLocalError ? <Alert variant="error">{deleteLocalError}</Alert> : null}
        </div>
      </Modal>

      <Link to="/eventos" className="text-brand text-sm hover:underline">
        Voltar para a lista
      </Link>
    </div>
  );
}
