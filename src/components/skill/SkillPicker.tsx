import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Field } from "../ui/Field";
import { Input } from "../ui/Input";
import { LoadMoreButton } from "../ui/LoadMoreButton";
import { Spinner } from "../ui/Spinner";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePageable } from "../../hooks/usePageable";
import { listSkills } from "../../services/skill";
import type { Skill } from "../../types/api";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";

interface SkillPickerProps {
  selected: Skill | null;
  onSelect: (skill: Skill | null) => void;
  label?: string;
  hint?: string;
  clearLabel?: string;
  emptyHint?: string;
}

// O filtro `skill` da API é match exato do nome (normalizado em caixa alta), então
// texto livre não encontra ninguém: a seleção vem sempre do catálogo.
export function SkillPicker({
  selected,
  onSelect,
  label = "Filtrar por habilidade",
  hint = "Escolha uma habilidade do catálogo.",
  clearLabel = "Todas as habilidades",
  emptyHint = "Sem habilidade: a lista mostra todas as pessoas.",
}: SkillPickerProps) {
  const groupName = useId();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);

  const fetcher = useCallback(
    (page: number) => listSkills({ page, name: debouncedSearch }),
    [debouncedSearch],
  );

  const { items, hasNext, loading, error, loadMore, reset } = usePageable(fetcher);
  const filterKey = debouncedSearch;
  const isFirstRun = useRef(true);

  useEffect(() => {
    // O usePageable já carrega a página 1 no mount: só reseta quando o filtro muda.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    reset();
  }, [filterKey, reset]);

  // A skill selecionada pode não estar na página atual: fixa no topo para o
  // radio correspondente sempre existir.
  const options =
    selected && !items.some((skill) => skill.id === selected.id) ? [selected, ...items] : items;

  const detail = apiErrorDetail(error);

  return (
    <div className="flex flex-col gap-4">
      {selected ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">Habilidade selecionada</Badge>
          <span className="text-ink text-sm">{selected.name}</span>
        </div>
      ) : (
        <p className="text-ink-muted text-xs">{emptyHint}</p>
      )}

      <Field label="Buscar habilidade no catálogo" htmlFor={`${groupName}-search`} hint={hint}>
        <Input
          id={`${groupName}-search`}
          name="skill_search"
          value={search}
          placeholder="Ex.: GO"
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
          title="Não foi possível carregar as habilidades"
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
            ? "Nenhuma habilidade começa com esse termo."
            : "O catálogo ainda não tem habilidades cadastradas."}
        </p>
      ) : null}

      {options.length > 0 || !loading ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-ink-muted mb-1 text-sm">{label}</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={groupName}
              value=""
              checked={selected === null}
              onChange={() => onSelect(null)}
              className="accent-brand"
            />
            <span>{clearLabel}</span>
          </label>

          {options.map((skill) => (
            <label key={skill.id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={groupName}
                value={skill.id}
                checked={selected?.id === skill.id}
                onChange={() => onSelect(skill)}
                className="accent-brand"
              />
              <span>{skill.name}</span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {items.length > 0 && (hasNext || loading) ? (
        <LoadMoreButton hasNext={hasNext} loading={loading} onLoadMore={loadMore} />
      ) : null}
    </div>
  );
}
