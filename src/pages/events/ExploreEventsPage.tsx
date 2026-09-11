import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router";
import { EventCard } from "../../components/event/EventCard";
import { EventFiltersBar } from "../../components/event/EventFiltersBar";
import { Alert } from "../../components/ui/Alert";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadMoreButton } from "../../components/ui/LoadMoreButton";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageSpinner } from "../../components/ui/Spinner";
import { usePageable } from "../../hooks/usePageable";
import { listEvents } from "../../services/event";
import { EVENT_CATEGORIES, EVENT_TYPES } from "../../types/api";
import type { EventCategory, EventType } from "../../types/api";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";

function readCategory(value: string | null): EventCategory | "" {
  return value && (EVENT_CATEGORIES as readonly string[]).includes(value)
    ? (value as EventCategory)
    : "";
}

function readType(value: string | null): EventType | "" {
  return value && (EVENT_TYPES as readonly string[]).includes(value) ? (value as EventType) : "";
}

export function ExploreEventsPage() {
  const [searchParams] = useSearchParams();

  const category = readCategory(searchParams.get("category"));
  const type = readType(searchParams.get("type"));
  const city = searchParams.get("city") ?? "";
  const upcoming = searchParams.get("upcoming") === "true";
  const communityId = searchParams.get("community_id") ?? "";

  const fetcher = useCallback(
    (page: number) => listEvents({ page, category, type, city, upcoming, communityId }),
    [category, type, city, upcoming, communityId],
  );

  const { items, hasNext, loading, error, loadMore, reset } = usePageable(fetcher);

  const filterKey = `${category}|${type}|${city}|${upcoming}|${communityId}`;
  const isFirstRun = useRef(true);
  useEffect(() => {
    // O usePageable já carrega a página 1 no mount: só reseta quando o filtro muda.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    reset();
    window.scrollTo({ top: 0 });
  }, [filterKey, reset]);

  const hasFilters = Boolean(category || type || city || upcoming || communityId);
  const detail = useMemo(() => apiErrorDetail(error), [error]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Eventos"
        description="Encontros, mentorias e webinars da comunidade dev/tech."
      />

      <EventFiltersBar />

      {loading && items.length === 0 ? <PageSpinner /> : null}

      {error && items.length === 0 ? (
        <Alert
          variant="error"
          title="Não foi possível carregar os eventos"
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
        <EmptyState
          title="Nenhum evento encontrado."
          description={
            hasFilters
              ? "Nenhum evento com esses filtros. Ajuste ou limpe os filtros para ver mais resultados."
              : "Ainda não há eventos cadastrados por aqui."
          }
        />
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
    </div>
  );
}
