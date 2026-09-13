import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SkillAdminPanel } from "../../components/skill/SkillAdminPanel";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { LoadMoreButton } from "../../components/ui/LoadMoreButton";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageSpinner } from "../../components/ui/Spinner";
import { useAuth } from "../../context/useAuth";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePageable } from "../../hooks/usePageable";
import { createSkill, listSkills } from "../../services/skill";
import type { Skill } from "../../types/api";
import { apiErrorDetail, apiErrorFields, apiErrorMessage, hasApiMessage } from "../../utils/apiError";
import { canAtLeast } from "../../utils/roles";

export function SkillsPage() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const debouncedName = useDebouncedValue(name, 400);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<unknown>(null);

  const fetcher = useCallback(
    (page: number) => listSkills({ page, name: debouncedName }),
    [debouncedName],
  );

  const { items, hasNext, loading, error, loadMore, reset } = usePageable(fetcher);

  const filterKey = debouncedName;
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

  const canManage = canAtLeast(user?.role, "MODERATOR");
  const detail = useMemo(() => apiErrorDetail(error), [error]);

  // O catálogo é paginado e a busca é por prefixo: uma habilidade recém-criada ou
  // renomeada pode não estar na página carregada. Em vez de refazer a busca (que
  // perderia a posição do usuário), o item é aplicado na lista em memória.
  const handleCreated = useCallback(
    (created: Skill) => {
      reset();
      void created;
    },
    [reset],
  );

  const handleUpdated = useCallback(
    (updated: Skill) => {
      reset();
      void updated;
    },
    [reset],
  );

  const handleDeleted = useCallback(
    (skillId: string) => {
      void skillId;
      reset();
    },
    [reset],
  );

  // A busca sem resultado pode cadastrar o termo digitado direto no catálogo: é a
  // rota do usuário comum, já que o painel de administração é só para moderadores.
  const handleCreateFromSearch = useCallback(async () => {
    const term = debouncedName.trim();
    if (!term) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createSkill(term);
      reset();
    } catch (caught) {
      setCreateError(caught);
      // Corrida com outro cadastro: refaz a busca para a habilidade existente
      // aparecer na lista em vez de só mostrar o erro.
      if (hasApiMessage(caught, "skill already exists")) reset();
    } finally {
      setCreating(false);
    }
  }, [debouncedName, reset]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Skills"
        description="Catálogo de habilidades da plataforma. Use a busca para encontrar uma habilidade pelo começo do nome."
      />

      <Field
        label="Buscar habilidade"
        htmlFor="skill-name"
        hint="A busca é pelo começo do nome e ignora maiúsculas e minúsculas: “go” encontra “GOLANG”, mas “lang” não."
      >
        <Input
          id="skill-name"
          name="name"
          value={name}
          placeholder="Ex.: GO"
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      {createError ? (
        <Alert variant="error">
          {apiErrorFields(createError).name ?? apiErrorMessage(createError)}
        </Alert>
      ) : null}

      {canManage ? (
        <SkillAdminPanel
          onCreated={handleCreated}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        >
          {({ editingId, onEdit, onRemove }) => (
            <div className="flex flex-col gap-2">
              <h3 className="text-ink text-sm font-semibold">Ações por habilidade</h3>
              <p className="text-ink-muted text-sm">
                Use os botões de cada item da lista abaixo para renomear ou arquivar.
              </p>
              {editingId ? (
                <p className="text-ink-muted text-xs">
                  Editando uma habilidade: o formulário de renomear está aberto acima.
                </p>
              ) : null}
              <ul className="flex flex-wrap gap-2">
                {items.map((skill) => (
                  <li key={skill.id} className="flex items-center gap-2">
                    <span className="text-ink-muted text-xs">{skill.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(skill)}
                    >
                      Renomear {skill.name}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(skill)}
                    >
                      Arquivar {skill.name}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SkillAdminPanel>
      ) : null}

      {loading && items.length === 0 ? <PageSpinner /> : null}

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
        <EmptyState
          title="Nenhuma habilidade encontrada."
          description={
            debouncedName
              ? "Nenhuma habilidade começa com esse termo. Tente outro trecho ou limpe a busca."
              : "O catálogo ainda não tem habilidades cadastradas."
          }
          action={
            debouncedName ? (
              <Button type="button" loading={creating} onClick={() => void handleCreateFromSearch()}>
                {`Cadastrar "${debouncedName.trim()}" no catálogo`}
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {items.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {items.map((skill) => (
            <li
              key={skill.id}
              className="bg-surface border-line text-ink rounded-md border px-3 py-1.5 text-sm"
            >
              {skill.name}
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
