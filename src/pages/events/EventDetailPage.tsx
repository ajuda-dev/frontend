import { useCallback, useEffect, useState } from "react";
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
import { ConfirmModal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageSpinner } from "../../components/ui/Spinner";
import { useAuth } from "../../context/useAuth";
import { useParticipants } from "../../hooks/useParticipants";
import { deleteEvent, findEventById } from "../../services/event";
import { isApiError } from "../../services/api";
import type { EventItem } from "../../types/api";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";
import { isEventApproved } from "../../utils/events";
import { formatAddress, formatDateTime } from "../../utils/format";
import { EVENT_CATEGORY_COLOR, EVENT_CATEGORY_LABEL, EVENT_TYPE_LABEL } from "../../utils/labels";
import { canAtLeast } from "../../utils/roles";

interface DetailLocationState {
  event?: EventItem;
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
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    // Evento vindo da navegação (state da lista) já está carregado.
    if (event) return;
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const found = await findEventById(id, controller.signal);
        if (controller.signal.aborted) return;
        setEvent(found);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(caught);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void run();
    return () => controller.abort();
  }, [id, attempt, event]);

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

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteEvent(id);
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
  }, [id, navigate]);

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
  // O backend não checa dono/cargo no delete (assimetria conhecida): a UI restringe
  // a owner ou ≥ MODERATOR.
  const canDelete = isOwner || canAtLeast(user?.role, "MODERATOR");
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

      {isOwner ? (
        <HostPanel event={event} participation={participation} currentUserId={user?.id ?? null} />
      ) : (
        <ParticipationZone event={event} participation={participation} />
      )}

      {deleteError ? <Alert variant="error">{deleteError}</Alert> : null}

      {canDelete ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
            Excluir evento
          </Button>
        </div>
      ) : null}

      <ConfirmModal
        open={confirmingDelete}
        title="Excluir evento"
        description={
          isOwner
            ? "Excluir evento? Esta ação não pode ser desfeita."
            : "Você está excluindo um evento que não é seu. Esta ação não pode ser desfeita."
        }
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onClose={() => setConfirmingDelete(false)}
      />

      <Link to="/eventos" className="text-brand text-sm hover:underline">
        Voltar para a lista
      </Link>
    </div>
  );
}
