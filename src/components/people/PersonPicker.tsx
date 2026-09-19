import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePageable } from "../../hooks/usePageable";
import { listUsers } from "../../services/user";
import type { Skill, UserWithSkills } from "../../types/api";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";
import { SkillPicker } from "../skill/SkillPicker";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Field } from "../ui/Field";
import { Input } from "../ui/Input";
import { LoadMoreButton } from "../ui/LoadMoreButton";
import { Spinner } from "../ui/Spinner";

interface PersonPickerProps {
  selected: UserWithSkills | null;
  onSelect: (person: UserWithSkills | null) => void;
  excludeIds?: string[];
  allowEmpty?: boolean;
  emptyLabel?: string;
  emptyHint?: string;
}

// Busca de pessoas do plano 09 (nome + skill do catálogo), no mesmo formato do
// CommunityPicker: lista com rádio, pessoa selecionada fixada no topo.
export function PersonPicker({
  selected,
  onSelect,
  excludeIds = [],
  allowEmpty = false,
  emptyLabel = "Sem convite agora",
  emptyHint = "Sem convite agora: você pode convidar depois na página do 1:1.",
}: PersonPickerProps) {
  const groupName = useId();
  const [name, setName] = useState("");
  const debouncedName = useDebouncedValue(name, 400);
  const [skill, setSkill] = useState<Skill | null>(null);
  const excluded = new Set(excludeIds);

  const fetcher = useCallback(
    (page: number) => listUsers({ page, name: debouncedName, skill: skill?.name }),
    [debouncedName, skill],
  );

  const { items, hasNext, loading, error, loadMore, reset } = usePageable(fetcher);

  const filterKey = `${debouncedName}|${skill?.id ?? ""}`;
  const isFirstRun = useRef(true);
  useEffect(() => {
    // O usePageable já carrega a página 1 no mount: só reseta quando o filtro muda.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    reset();
  }, [filterKey, reset]);

  const visible = items.filter((person) => !excluded.has(person.id));
  const options =
    selected && !visible.some((person) => person.id === selected.id)
      ? [selected, ...visible]
      : visible;

  const detail = apiErrorDetail(error);
  const hasFilters = Boolean(debouncedName || skill);

  return (
    <div className="flex flex-col gap-4">
      {selected ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">Pessoa selecionada</Badge>
          <span className="text-ink text-sm">{selected.name}</span>
        </div>
      ) : allowEmpty ? (
        <p className="text-ink-muted text-xs">{emptyHint}</p>
      ) : null}

      <Field
        label="Buscar por nome"
        htmlFor={`${groupName}-name`}
        hint="Busca por trecho do nome, ignorando maiúsculas e acentos."
      >
        <Input
          id={`${groupName}-name`}
          name="person_name"
          value={name}
          placeholder="Ex.: Lucas"
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <SkillPicker
        selected={skill}
        onSelect={setSkill}
        label="Filtrar por habilidade"
        hint="A busca é pelo começo do nome da habilidade."
        clearLabel="Todas as habilidades"
        emptyHint="Sem habilidade: a lista mostra todas as pessoas."
      />

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : null}

      {error && items.length === 0 ? (
        <Alert
          variant="error"
          title="Não foi possível carregar as pessoas"
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

      {!loading && !error && visible.length === 0 && !selected ? (
        <p className="text-ink-muted text-sm">
          {hasFilters
            ? "Ninguém corresponde a esses filtros."
            : "Ainda não há pessoas cadastradas na plataforma."}
        </p>
      ) : null}

      {options.length > 0 || allowEmpty ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-ink-muted mb-1 text-sm">Pessoa</legend>
          {allowEmpty ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={groupName}
                value=""
                checked={selected === null}
                onChange={() => onSelect(null)}
                className="accent-brand"
              />
              <span>{emptyLabel}</span>
            </label>
          ) : null}

          {options.map((person) => (
            <label
              key={person.id}
              className="bg-surface-2 border-line flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <input
                type="radio"
                name={groupName}
                value={person.id}
                checked={selected?.id === person.id}
                onChange={() => onSelect(person)}
                className="accent-brand"
              />
              <span className="text-ink">{person.name}</span>
              {person.skills.length > 0 ? (
                <span className="text-ink-muted text-xs">
                  {person.skills.map((entry) => entry.name).join(", ")}
                </span>
              ) : null}
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
