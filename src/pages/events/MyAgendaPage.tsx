import { useCallback, useMemo } from "react";
import { EventCard } from "../../components/event/EventCard";
import { Alert } from "../../components/ui/Alert";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadMoreButton } from "../../components/ui/LoadMoreButton";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageSpinner } from "../../components/ui/Spinner";
import { useAuth } from "../../context/useAuth";
import { usePageable } from "../../hooks/usePageable";
import { listEvents } from "../../services/event";
import type { EventItem, Pageable } from "../../types/api";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";

interface AgendaSectionProps {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  fetchPage: (page: number) => Promise<Pageable<EventItem>>;
}

function AgendaSection({
  title,
  description,
  emptyTitle,
  emptyDescription,
  fetchPage,
}: AgendaSectionProps) {
  const { items, hasNext, loading, error, loadMore, reset } = usePageable(fetchPage);
  const detail = useMemo(() => apiErrorDetail(error), [error]);

  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-ink text-base font-semibold">{title}</h2>
        <p className="text-ink-muted text-xs">{description}</p>
      </div>

      {loading && items.length === 0 ? <PageSpinner /> : null}

      {error && items.length === 0 ? (
        <Alert
          variant="error"
          title="Não foi possível carregar seus eventos"
          action={
            <button type="button" onClick={reset} className="text-brand text-sm hover:underline">
              Tentar novamente
            </button>
          }
        >
          {apiErrorMessage(error)}
          {detail ? <span className="block text-xs">{detail}</span> : null}
        </Alert>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : null}

      {items.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>
      ) : null}

      {items.length > 0 ? (
        <LoadMoreButton hasNext={hasNext} loading={loading} onLoadMore={loadMore} />
      ) : null}
    </section>
  );
}

// Agenda pessoal: três recortes da listagem de eventos com o filtro `user_id`
// combinado a papel/status da participação (o backend junta event_users).
export function MyAgendaPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const confirmed = useCallback(
    (page: number) => listEvents({ page, userId, status: "CONFIRMED" }),
    [userId],
  );
  const invites = useCallback(
    (page: number) => listEvents({ page, userId, role: "MENTEE", status: "REQUESTED" }),
    [userId],
  );
  const cancelled = useCallback(
    (page: number) => listEvents({ page, userId, status: "CANCELLED" }),
    [userId],
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Agenda"
        description="Seus eventos confirmados, convites de mentoria e inscrições canceladas."
      />

      <AgendaSection
        title="Confirmados"
        description="Eventos que você participa ou mentora."
        emptyTitle="Nenhum evento confirmado."
        emptyDescription="Inscreva-se em um evento ou aceite um convite de mentoria para vê-los aqui."
        fetchPage={confirmed}
      />

      <AgendaSection
        title="Convites de mentoria"
        description="Convites que aguardam o seu aceite."
        emptyTitle="Nenhum convite de mentoria pendente."
        emptyDescription="Quando um mentor convidar você para uma mentoria, o convite aparece aqui."
        fetchPage={invites}
      />

      <AgendaSection
        title="Cancelados"
        description="Inscrições e convites cancelados."
        emptyTitle="Nenhuma inscrição cancelada."
        emptyDescription="Eventos em que você cancelou a participação aparecem aqui — dá para se inscrever de novo pelo detalhe."
        fetchPage={cancelled}
      />
    </div>
  );
}
