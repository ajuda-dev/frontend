import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { CommunityCard } from "../../components/community/CommunityCard";
import { Alert } from "../../components/ui/Alert";
import { EmptyState } from "../../components/ui/EmptyState";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { LoadMoreButton } from "../../components/ui/LoadMoreButton";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageSpinner } from "../../components/ui/Spinner";
import { useAuth } from "../../context/useAuth";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useMemberships } from "../../hooks/useMemberships";
import { usePageable } from "../../hooks/usePageable";
import { listCommunities } from "../../services/community";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";

export function ExploreCommunitiesPage() {
  const { user } = useAuth();
  const [city, setCity] = useState("");
  const [name, setName] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const debouncedCity = useDebouncedValue(city, 400);
  const debouncedName = useDebouncedValue(name, 400);
  const memberships = useMemberships(user?.id);

  const ownerId = onlyMine ? user?.id : undefined;

  const fetcher = useCallback(
    (page: number) =>
      listCommunities({ page, city: debouncedCity, name: debouncedName, ownerId }),
    [debouncedCity, debouncedName, ownerId],
  );

  const { items, hasNext, loading, error, loadMore, reset } = usePageable(fetcher);

  const filterKey = `${debouncedCity}|${debouncedName}|${ownerId ?? ""}`;
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

  const hasFilters = Boolean(debouncedCity || debouncedName || onlyMine);
  const detail = useMemo(() => apiErrorDetail(error), [error]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Comunidades"
        description="Encontre comunidades dev/tech perto de você e participe."
        actions={
          <Link to="/comunidades/nova" className="text-brand text-sm hover:underline">
            Nova comunidade
          </Link>
        }
      />

      <div className="flex flex-col gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(event) => setOnlyMine(event.target.checked)}
            className="accent-brand"
          />
          <span>Mostrar apenas as comunidades que eu criei</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Filtrar por cidade"
            htmlFor="city"
            hint="Busca por parte do nome da cidade; maiúsculas e acentos não importam."
          >
            <Input
              id="city"
              name="city"
              value={city}
              placeholder="Ex.: São Paulo"
              onChange={(event) => setCity(event.target.value)}
            />
          </Field>

          <Field
            label="Buscar pelo nome"
            htmlFor="name"
            hint="Busca por parte do nome da comunidade; acentos não importam."
          >
            <Input
              id="name"
              name="name"
              value={name}
              placeholder="Ex.: Dev SP"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
        </div>
      </div>

      {memberships.notice ? (
        <Alert variant={memberships.notice.tone === "error" ? "error" : "info"}>
          {memberships.notice.message}
        </Alert>
      ) : null}

      {loading && items.length === 0 ? <PageSpinner /> : null}

      {error && items.length === 0 ? (
        <Alert
          variant="error"
          title="Não foi possível carregar as comunidades"
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
          title="Nenhuma comunidade encontrada."
          description={
            hasFilters
              ? "Nenhuma comunidade corresponde aos filtros. Tente outro trecho ou limpe os filtros."
              : "Ainda não há comunidades cadastradas por aqui."
          }
        />
      ) : null}

      {items.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((community) => (
            <li key={community.id}>
              <CommunityCard community={community} isMember={memberships.isMember(community.id)} />
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
