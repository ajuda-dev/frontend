import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageSpinner } from "../../components/ui/Spinner";
import { useAuth } from "../../context/useAuth";
import { findEventById } from "../../services/event";
import type { EventItem } from "../../types/api";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";
import { formatAddress, formatDateTime } from "../../utils/format";
import { EVENT_CATEGORY_COLOR, EVENT_CATEGORY_LABEL, EVENT_TYPE_LABEL } from "../../utils/labels";

interface DetailLocationState {
  event?: EventItem;
}

export function EventDetailPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const fromList = (location.state as DetailLocationState | null)?.event;
  const [event, setEvent] = useState<EventItem | null>(
    fromList && fromList.id === id ? fromList : null,
  );
  const [loading, setLoading] = useState(!event);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

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

      <Link to="/eventos" className="text-brand text-sm hover:underline">
        Voltar para a lista
      </Link>
    </div>
  );
}
