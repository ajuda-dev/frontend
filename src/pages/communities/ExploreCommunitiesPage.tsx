import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const debouncedCity = useDebouncedValue(city, 400);
  const memberships = useMemberships(user?.id);

  const fetcher = useCallback(
    (page: number) => listCommunities({ page, city: debouncedCity }),
    [debouncedCity],
  );

  const { items, hasNext, loading, error, loadMore, reset } = usePageable(fetcher);

  const isFirstRun = useRef(true);
  useEffect(() => {
    // O usePageable já carrega a página 1 no mount: só reseta quando o filtro muda.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    reset();
    window.scrollTo({ top: 0 });
  }, [debouncedCity, reset]);

  const detail = useMemo(() => apiErrorDetail(error), [error]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Comunidades"
        description="Encontre comunidades dev/tech perto de você e participe."
      />

      <Field
        label="Filtrar por cidade"
        htmlFor="city"
        hint="Busca por parte do nome da cidade cadastrada no endereço da comunidade."
      >
        <Input
          id="city"
          name="city"
          value={city}
          placeholder="Ex.: São Paulo"
          onChange={(event) => setCity(event.target.value)}
        />
      </Field>

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
            debouncedCity
              ? "Nenhuma comunidade com essa cidade. Tente outro trecho do nome ou limpe o filtro."
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
