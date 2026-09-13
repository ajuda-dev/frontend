import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { AddSkillForm } from "../../components/profile/AddSkillForm";
import { SkillRow } from "../../components/profile/SkillRow";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmModal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageSpinner } from "../../components/ui/Spinner";
import { useAuth } from "../../context/useAuth";
import { assignSkillToUser } from "../../services/skill";
import { getUserProfile, getUserSkills, removeUserSkill } from "../../services/user";
import type { Skill, SkillLevel, SkillUser, UserProfile } from "../../types/api";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";
import { USER_ROLE_COLOR, USER_ROLE_LABEL } from "../../utils/labels";

export function MyProfilePage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<SkillUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<SkillUser | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

      <Card className="flex flex-col gap-2">
        <h2 className="text-ink text-base font-semibold">Conta</h2>
        <dl className="text-ink-muted grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs">E-mail</dt>
            <dd className="text-ink">{user.email}</dd>
          </div>
        </dl>
        <p className="text-ink-muted text-xs">E-mail, senha e cargo são somente leitura.</p>
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
