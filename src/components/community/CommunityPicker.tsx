import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Badge } from "../ui/Badge";
import { Alert } from "../ui/Alert";
import { Field } from "../ui/Field";
import { Input } from "../ui/Input";
import { LoadMoreButton } from "../ui/LoadMoreButton";
import { Spinner } from "../ui/Spinner";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePageable } from "../../hooks/usePageable";
import { listCommunities } from "../../services/community";
import type { Community } from "../../types/api";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";

interface CommunityPickerProps {
  ownerId: string;
  selected: Community | null;
  onSelect: (community: Community | null) => void;
}

function locationOf(community: Community): string {
  return community.address ? `${community.address.city}/${community.address.state}` : "";
}

// Seleção de comunidade do formulário de evento. A API não tem "minhas comunidades"
// como endpoint dedicado: o recorte é `?owner_id=` na listagem (plano 15 do backend),
// combinado com `?name=` para a busca por trecho do nome.
export function CommunityPicker({ ownerId, selected, onSelect }: CommunityPickerProps) {
  const groupName = useId();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);

  const fetcher = useCallback(
    (page: number) => listCommunities({ page, name: debouncedSearch, ownerId }),
    [debouncedSearch, ownerId],
  );

  const { items, hasNext, loading, error, loadMore, reset } = usePageable(fetcher);
  const filterKey = `${ownerId}|${debouncedSearch}`;
  const isFirstRun = useRef(true);

  useEffect(() => {
    // O usePageable já carrega a página 1 no mount: só reseta quando o filtro muda.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    reset();
  }, [filterKey, reset]);

  // A comunidade selecionada pode não estar na página atual (ou ter vindo da URL):
  // ela é fixada no topo da lista para o radio correspondente sempre existir.
  const options =
    selected && !items.some((community) => community.id === selected.id)
      ? [selected, ...items]
      : items;

  const detail = apiErrorDetail(error);
  const selectedLocation = selected ? locationOf(selected) : "";

  return (
    <div className="flex flex-col gap-4">
      {selected ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">Vínculo selecionado</Badge>
          <span className="text-ink text-sm">{selected.name}</span>
          {selectedLocation ? (
            <span className="text-ink-muted text-xs">{selectedLocation}</span>
          ) : null}
        </div>
      ) : (
        <p className="text-ink-muted text-xs">
          Sem vínculo: o evento será publicado de forma avulsa.
        </p>
      )}

      <Field
        label="Buscar comunidade pelo nome"
        htmlFor={`${groupName}-search`}
        hint="Opcional — lista apenas as comunidades que você criou."
      >
        <Input
          id={`${groupName}-search`}
          name="community_search"
          value={search}
          placeholder="Ex.: Dev SP"
          onChange={(event) => setSearch(event.target.value)}
        />
      </Field>

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : null}

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
        <p className="text-ink-muted text-sm">
          {debouncedSearch
            ? "Nenhuma comunidade sua com esse nome."
            : "Você ainda não criou nenhuma comunidade."}
        </p>
      ) : null}

      {options.length > 0 || !loading ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-ink-muted mb-1 text-sm">Comunidade do evento</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={groupName}
              value=""
              checked={selected === null}
              onChange={() => onSelect(null)}
              className="accent-brand"
            />
            <span>Sem comunidade (evento avulso)</span>
          </label>

          {options.map((community) => {
            const location = locationOf(community);
            return (
              <label key={community.id} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={groupName}
                  value={community.id}
                  checked={selected?.id === community.id}
                  onChange={() => onSelect(community)}
                  className="accent-brand"
                />
                <span>{community.name}</span>
                {location ? <span className="text-ink-muted text-xs">{location}</span> : null}
              </label>
            );
          })}
        </fieldset>
      ) : null}

      {items.length > 0 && (hasNext || loading) ? (
        <LoadMoreButton hasNext={hasNext} loading={loading} onLoadMore={loadMore} />
      ) : null}
    </div>
  );
}
