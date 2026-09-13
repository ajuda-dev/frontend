import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SkillPersonCard } from "../../components/people/SkillPersonCard";
import { SkillPicker } from "../../components/skill/SkillPicker";
import { Alert } from "../../components/ui/Alert";
import { EmptyState } from "../../components/ui/EmptyState";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { LoadMoreButton } from "../../components/ui/LoadMoreButton";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageSpinner } from "../../components/ui/Spinner";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePageable } from "../../hooks/usePageable";
import { listUsers } from "../../services/user";
import type { Skill } from "../../types/api";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";

export function PeoplePage() {
  const [skill, setSkill] = useState<Skill | null>(null);
  const [name, setName] = useState("");
  const debouncedName = useDebouncedValue(name, 400);

  const fetcher = useCallback(
    (page: number) => listUsers({ page, skill: skill?.name, name: debouncedName }),
    [skill, debouncedName],
  );

  const { items, hasNext, loading, error, loadMore, reset } = usePageable(fetcher);

  const filterKey = `${skill?.id ?? ""}|${debouncedName}`;
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

  const hasFilters = Boolean(skill || debouncedName);
  const detail = useMemo(() => apiErrorDetail(error), [error]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pessoas"
        description="Encontre pessoas pela habilidade que elas dominam ou pelo nome. Sem filtro, a lista mostra todas as pessoas da plataforma."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Buscar por nome"
          htmlFor="people-name"
          hint="Busca por trecho do nome, ignorando maiúsculas e acentos."
        >
          <Input
            id="people-name"
            name="name"
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
        />
      </div>

      {loading && items.length === 0 ? <PageSpinner /> : null}

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

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="Nenhuma pessoa encontrada."
          description={
            hasFilters
              ? "Ninguém corresponde a esses filtros. Tente outra habilidade ou outro trecho do nome."
              : "Ainda não há pessoas cadastradas na plataforma."
          }
        />
      ) : null}

      {items.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((person) => (
            <li key={person.id}>
              <SkillPersonCard person={person} />
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
