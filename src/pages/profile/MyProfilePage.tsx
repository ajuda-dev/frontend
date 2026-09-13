import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { AddSkillForm } from "../../components/profile/AddSkillForm";
import { SkillRow } from "../../components/profile/SkillRow";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { ConfirmModal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageSpinner } from "../../components/ui/Spinner";
import { useAuth } from "../../context/useAuth";
import { assignSkillToUser } from "../../services/skill";
import { getUserProfile, getUserSkills, removeUserSkill } from "../../services/user";
import type { Skill, SkillLevel, SkillUser, UserProfile } from "../../types/api";
import { apiErrorDetail, apiErrorFields, apiErrorMessage } from "../../utils/apiError";
import { USER_ROLE_COLOR, USER_ROLE_LABEL } from "../../utils/labels";
import { NAME_MAX_LENGTH, validatePersonName } from "../../utils/nameValidation";

export function MyProfilePage() {
  const { user, updateProfile } = useAuth();
  const userId = user?.id ?? "";
  const nameFieldId = useId();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<SkillUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<SkillUser | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [foundProfile, foundSkills] = await Promise.all([
          getUserProfile(userId, controller.signal),
          getUserSkills(userId, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setProfile(foundProfile);
        setSkills(foundSkills);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(caught);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void run();
    return () => controller.abort();
  }, [userId, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const detail = useMemo(() => apiErrorDetail(error), [error]);

  const refreshSkills = useCallback(async () => {
    setSkills(await getUserSkills(userId));
  }, [userId]);

  // Toda ação de skill termina com refetch: mudar nível são duas chamadas (não há
  // PUT) e uma falha parcial não pode deixar a lista otimista na tela.
  const runSkillAction = useCallback(
    async (action: () => Promise<void>) => {
      setActionError(null);
      setNotice(null);
      try {
        await action();
      } catch (caught) {
        setActionError(apiErrorMessage(caught));
      }
      try {
        await refreshSkills();
      } catch {
        setActionError("Não foi possível atualizar a lista de habilidades. Recarregue a página.");
      }
    },
    [refreshSkills],
  );

  const handleAddSkill = useCallback(
    async (skill: Skill, level: SkillLevel) => {
      setActionError(null);
      await assignSkillToUser(skill.id, userId, level);
      setNotice(`Habilidade adicionada: ${skill.name}.`);
      try {
        await refreshSkills();
      } catch {
        setActionError("Não foi possível atualizar a lista de habilidades. Recarregue a página.");
      }
    },
    [userId, refreshSkills],
  );

  const handleRemove = useCallback(
    async (entry: SkillUser) => {
      setBusyId(entry.id);
      await runSkillAction(async () => {
        await removeUserSkill(userId, entry.skill_id);
        setNotice(`Habilidade removida: ${entry.skill?.name ?? "habilidade"}.`);
      });
      setRemoving(null);
      setBusyId(null);
    },
    [userId, runSkillAction],
  );

  const handleChangeLevel = useCallback(
    async (entry: SkillUser, level: SkillLevel) => {
      if (level === entry.level) return;
      setBusyId(entry.id);
      await runSkillAction(async () => {
        // Não existe PUT de associação: mudar nível = remover + adicionar.
        await removeUserSkill(userId, entry.skill_id);
        await assignSkillToUser(entry.skill_id, userId, level);
        setNotice(`Nível atualizado: ${entry.skill?.name ?? "habilidade"}.`);
      });
      setBusyId(null);
    },
    [userId, runSkillAction],
  );

  const startEditingName = useCallback(() => {
    setNameDraft(user?.name ?? "");
    setNameError(undefined);
    setActionError(null);
    setNotice(null);
    setEditingName(true);
  }, [user?.name]);

  const cancelEditingName = useCallback(() => {
    setEditingName(false);
    setNameError(undefined);
  }, []);

  const handleSaveName = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setActionError(null);
      setNotice(null);

      const localError = validatePersonName(nameDraft);
      if (localError) {
        setNameError(localError);
        return;
      }

      const trimmed = nameDraft.trim();
      setNameError(undefined);
      setSavingName(true);
      try {
        const updated = await updateProfile(trimmed);
        setProfile((current) => (current ? { ...current, name: updated.name } : current));
        setEditingName(false);
        setNotice("Nome atualizado.");
      } catch (caught) {
        const fields = apiErrorFields(caught);
        if (fields.name) setNameError(fields.name);
        else setActionError(apiErrorMessage(caught));
      } finally {
        setSavingName(false);
      }
    },
    [nameDraft, updateProfile],
  );

  if (!user) return null;
  if (loading) return <PageSpinner />;

  if (error || !profile) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Meu perfil" />
        <Alert
          variant="error"
          title="Não foi possível carregar o perfil"
          action={
            <button type="button" onClick={retry} className="text-brand text-sm hover:underline">
              Tentar novamente
            </button>
          }
        >
          {error ? apiErrorMessage(error) : "A API não devolveu os dados do perfil."}
          {detail ? <span className="block text-xs">{detail}</span> : null}
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={profile.name}
        description={profile.description || "Sem descrição."}
        actions={
          <>
            <Badge tone={USER_ROLE_COLOR[user.role]}>{USER_ROLE_LABEL[user.role]}</Badge>
            <Link to={`/pessoas/${user.id}`} className="text-brand text-sm hover:underline">
              Ver perfil público
            </Link>
          </>
        }
      />

      <Card className="flex flex-col gap-3">
        <h2 className="text-ink text-base font-semibold">Conta</h2>

        {editingName ? (
          <form className="flex flex-col gap-3" onSubmit={handleSaveName} noValidate>
            <Field label="Nome" htmlFor={nameFieldId} error={nameError}>
              <Input
                id={nameFieldId}
                name="name"
                type="text"
                autoComplete="name"
                maxLength={NAME_MAX_LENGTH}
                value={nameDraft}
                invalid={Boolean(nameError)}
                onChange={(event) => setNameDraft(event.target.value)}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={savingName}>
                Salvar
              </Button>
              <Button type="button" variant="ghost" onClick={cancelEditingName}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-ink text-sm">{user.name}</p>
            <Button type="button" variant="secondary" size="sm" onClick={startEditingName}>
              Editar nome
            </Button>
          </div>
        )}

        <dl className="text-ink-muted grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs">E-mail</dt>
            <dd className="text-ink">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs">Cargo</dt>
            <dd className="text-ink">{USER_ROLE_LABEL[user.role]}</dd>
          </div>
          <div>
            <dt className="text-xs">Senha</dt>
            <dd className="text-ink">••••••••</dd>
          </div>
        </dl>
        <p className="text-ink-muted text-xs">
          E-mail, senha e cargo são somente leitura. O e-mail não pode ser alterado por aqui e a troca
          de senha estará disponível em breve.
        </p>
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="text-ink text-base font-semibold">Minhas habilidades</h2>

        {notice ? <Alert variant="success">{notice}</Alert> : null}
        {actionError ? <Alert variant="error">{actionError}</Alert> : null}

        <AddSkillForm onAdd={handleAddSkill} />

        {skills.length === 0 ? (
          <EmptyState
            title="Você ainda não cadastrou habilidades."
            description="Escolha uma habilidade no catálogo e informe seu nível para aparecer na busca por pessoas."
            action={
              <Link to="/skills" className="text-brand text-sm hover:underline">
                Descobrir skills no catálogo
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {skills.map((entry) => (
              <SkillRow
                key={entry.id}
                entry={entry}
                busy={busyId === entry.id}
                onChangeLevel={handleChangeLevel}
                onRemove={setRemoving}
              />
            ))}
          </ul>
        )}
      </section>

      <ConfirmModal
        open={removing !== null}
        title="Remover habilidade"
        description={
          removing
            ? `Remover ${removing.skill?.name ?? "esta habilidade"}? Você poderá adicioná-la de novo depois.`
            : ""
        }
        confirmLabel="Remover"
        loading={removing !== null && busyId === removing.id}
        onConfirm={() => {
          if (removing) void handleRemove(removing);
        }}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}
