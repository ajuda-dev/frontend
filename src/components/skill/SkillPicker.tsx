import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Input } from "../ui/Input";
import { LoadMoreButton } from "../ui/LoadMoreButton";
import { Spinner } from "../ui/Spinner";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePageable } from "../../hooks/usePageable";
import { createSkill, listSkills } from "../../services/skill";
import type { Pageable, Skill } from "../../types/api";
import {
  apiErrorDetail,
  apiErrorFields,
  apiErrorMessage,
  hasApiMessage,
} from "../../utils/apiError";

interface SkillPickerProps {
  selected: Skill | null;
  onSelect: (skill: Skill | null) => void;
  label?: string;
  hint?: string;
  clearLabel?: string;
  emptyHint?: string;
  // No formulário do perfil o rádio de limpar não faz sentido: a seleção vem do
  // catálogo e o botão de enviar já exige uma habilidade.
  showClear?: boolean;
  // Quando true, um termo buscado sem resultado pode ser cadastrado no catálogo
  // (POST /skill/register) e sai selecionado — usado no formulário do perfil para
  // adicionar uma habilidade que ainda não existe.
  allowCreate?: boolean;
  // Quando true, o catálogo só é consultado depois de o usuário digitar um termo:
  // nenhuma requisição é feita no mount e a lista não aparece antes da busca —
  // usado no formulário do perfil.
  requireSearch?: boolean;
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
  showClear = true,
  allowCreate = false,
  requireSearch = false,
}: SkillPickerProps) {
  const groupName = useId();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const searching = !requireSearch || debouncedSearch.trim() !== "";

  // Com requireSearch e sem termo o picker resolve uma página vazia: assim o
  // usePageable não pede a página 1 do catálogo ao backend.
  const fetcher = useCallback(
    (page: number): Promise<Pageable<Skill>> =>
      searching
        ? listSkills({ page, name: debouncedSearch })
        : Promise.resolve({ data: [], has_next: false }),
    [debouncedSearch, searching],
  );

  const { items, hasNext, loading, error, loadMore, reset } = usePageable(fetcher);
  const filterKey = debouncedSearch;
  const isFirstRun = useRef(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<unknown>(null);

  useEffect(() => {
    // O usePageable já carrega a página 1 no mount: só reseta quando o filtro muda.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    setCreateError(null);
    reset();
  }, [filterKey, reset]);

  async function handleCreate() {
    const term = debouncedSearch.trim();
    if (!term) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createSkill(term);
      onSelect(created);
      reset();
    } catch (caught) {
      setCreateError(caught);
      // Corrida com outro cadastro: refaz a busca para a habilidade existente
      // aparecer na lista em vez de só mostrar o erro.
      if (hasApiMessage(caught, "skill already exists")) reset();
    } finally {
      setCreating(false);
    }
  }

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

      {searching && loading && items.length === 0 ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : null}

      {searching && error && items.length === 0 ? (
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

      {!searching ? (
        <p className="text-ink-muted text-sm">Digite para buscar uma habilidade no catálogo.</p>
      ) : null}

      {searching && !loading && !error && items.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-ink-muted text-sm">
            {debouncedSearch
              ? "Nenhuma habilidade começa com esse termo."
              : "O catálogo ainda não tem habilidades cadastradas."}
          </p>
          {allowCreate && debouncedSearch ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={creating}
              onClick={() => void handleCreate()}
            >
              {`Cadastrar "${debouncedSearch.trim()}" no catálogo`}
            </Button>
          ) : null}
        </div>
      ) : null}

      {createError ? (
        <Alert variant="error">
          {apiErrorFields(createError).name ?? apiErrorMessage(createError)}
        </Alert>
      ) : null}

      {searching && (options.length > 0 || (showClear && !loading)) ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-ink-muted mb-1 text-sm">{label}</legend>
          {showClear ? (
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
          ) : null}

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
