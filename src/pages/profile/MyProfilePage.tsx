import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { AddSkillForm } from "../../components/profile/AddSkillForm";
import { SkillRow } from "../../components/profile/SkillRow";
import { Alert } from "../../components/ui/Alert";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { ConfirmModal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageSpinner } from "../../components/ui/Spinner";
import { Textarea } from "../../components/ui/Textarea";
import { useAuth } from "../../context/useAuth";
import { assignSkillToUser } from "../../services/skill";
import {
  getUserProfile,
  getUserSkills,
  removeUserSkill,
  updateUserProfile,
} from "../../services/user";
import type { ConfigVisibility, Skill, SkillLevel, SkillUser, UpdateUserInput, UserProfile } from "../../types/api";
import { apiErrorDetail, apiErrorFields, apiErrorMessage } from "../../utils/apiError";
import {
  CONTACT_KEYS,
  CONTACT_VALUE_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  contactFieldKey,
  contactLabel,
  contactEntriesWithoutPhoto,
  hiddenContactKeys,
  isContactLink,
  photoUrl,
  validateContactValue,
} from "../../utils/contacts";
import { USER_ROLE_COLOR, USER_ROLE_LABEL } from "../../utils/labels";
import { NAME_MAX_LENGTH, validatePersonName } from "../../utils/nameValidation";

const DESCRIPTION_MAX_LENGTH = 500;

interface ContactDraft {
  value: string;
  shareWithCommunity: boolean;
}

type ContactDrafts = Record<string, ContactDraft>;

function draftFrom(config: ConfigVisibility): ContactDrafts {
  const drafts: ContactDrafts = {};
  for (const key of CONTACT_KEYS) {
    drafts[key] = {
      value: config[key]?.value ?? "",
      shareWithCommunity: config[key]?.shareWithCommunity ?? false,
    };
  }
  return drafts;
}

function sameEntry(a: ContactDraft, b: ContactDraft): boolean {
  return a.value.trim() === b.value.trim() && a.shareWithCommunity === b.shareWithCommunity;
}

export function MyProfilePage() {
  const { user, updateProfile } = useAuth();
  const userId = user?.id ?? "";
  const nameFieldId = useId();
  const descriptionFieldId = useId();
  const contactIdPrefix = useId();
  const emailFieldId = useId();
  const emailShareId = useId();

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
  const [editingProfile, setEditingProfile] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [contactDrafts, setContactDrafts] = useState<ContactDrafts>({});
  const [emailShare, setEmailShare] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);

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

  const contacts = useMemo(
    () => contactEntriesWithoutPhoto(profile?.configVisibility ?? {}),
    [profile?.configVisibility],
  );
  const photo = useMemo(() => photoUrl(profile?.configVisibility ?? {}), [profile?.configVisibility]);
  const hiddenContacts = useMemo(
    () => hiddenContactKeys(profile?.configVisibility ?? {}),
    [profile?.configVisibility],
  );
  const emailHidden = Boolean(user?.email) && !profile?.configVisibility.email?.shareWithCommunity;

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

  const startEditingProfile = useCallback(() => {
    if (!profile) return;
    setDescriptionDraft(profile.description ?? "");
    setContactDrafts(draftFrom(profile.configVisibility));
    setEmailShare(profile.configVisibility.email?.shareWithCommunity ?? false);
    setProfileErrors({});
    setActionError(null);
    setNotice(null);
    setEditingProfile(true);
  }, [profile]);

  const cancelEditingProfile = useCallback(() => {
    setEditingProfile(false);
    setProfileErrors({});
  }, []);

  const setContactDraft = useCallback((key: string, patch: Partial<ContactDraft>) => {
    setContactDrafts((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
  }, []);

  // Diff contra o estado do servidor: chaves intocadas ficam fora do body (o merge
  // do backend substitui a entrada inteira de cada chave enviada).
  const profileDiff = useMemo((): UpdateUserInput | null => {
    if (!profile) return null;
    const body: UpdateUserInput = {};
    const current = profile.configVisibility ?? {};
    const visibility: ConfigVisibility = {};

    for (const key of CONTACT_KEYS) {
      const draft = contactDrafts[key];
      if (!draft) continue;
      const entry = current[key] ?? { value: "", shareWithCommunity: false };
      if (!sameEntry(draft, entry)) {
        visibility[key] = { value: draft.value.trim(), shareWithCommunity: draft.shareWithCommunity };
      }
    }

    const emailShared = current.email?.shareWithCommunity ?? false;
    if (emailShare !== emailShared) {
      // O valor do e-mail é gerenciado pelo sistema: só o compartilhamento é editável.
      visibility.email = { value: "", shareWithCommunity: emailShare };
    }

    const trimmedDescription = descriptionDraft.trim();
    if (trimmedDescription !== (profile.description ?? "").trim()) {
      body.description = trimmedDescription;
    }
    if (Object.keys(visibility).length > 0) body.configVisibility = visibility;
    return Object.keys(body).length > 0 ? body : null;
  }, [profile, contactDrafts, emailShare, descriptionDraft]);

  const handleSaveProfile = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setActionError(null);
      setNotice(null);

      const errors: Record<string, string> = {};
      const trimmedDescription = descriptionDraft.trim();
      if (trimmedDescription.length > DESCRIPTION_MAX_LENGTH) {
        errors.description = "O resumo deve ter no máximo 500 caracteres";
      } else if (!trimmedDescription && (profile?.description ?? "").trim()) {
        // O repositório ignora description vazia: sem este bloqueio o "salvar" seria um no-op silencioso.
        errors.description = "Não é possível apagar o resumo: escreva um novo texto ou cancele a edição";
      }

      for (const key of CONTACT_KEYS) {
        const draft = contactDrafts[key];
        if (!draft) continue;
        const valueError = validateContactValue(key, draft.value);
        if (valueError) {
          errors[key] = valueError;
        } else if (draft.shareWithCommunity && draft.value.trim() === "") {
          errors[key] = "Para compartilhar, informe um valor";
        }
      }

      if (Object.keys(errors).length > 0) {
        setProfileErrors(errors);
        return;
      }

      const body = profileDiff;
      if (!body) return;

      setProfileErrors({});
      setSavingProfile(true);
      try {
        const updated = await updateUserProfile(userId, body);
        setProfile((current) =>
          current
            ? {
                ...current,
                description: updated.description ?? "",
                configVisibility: updated.configVisibility ?? {},
              }
            : current,
        );
        setEditingProfile(false);
        setNotice("Perfil atualizado.");
      } catch (caught) {
        const fields = apiErrorFields(caught);
        const mapped: Record<string, string> = {};
        let general: string | null = null;
        for (const [field, message] of Object.entries(fields)) {
          const key = contactFieldKey(field);
          if (key && (CONTACT_KEYS as readonly string[]).includes(key)) mapped[key] = message;
          else if (field === "description") mapped.description = message;
          else general = general ?? message;
        }
        if (Object.keys(mapped).length > 0) setProfileErrors(mapped);
        if (general) setActionError(general);
        else if (Object.keys(mapped).length === 0) setActionError(apiErrorMessage(caught));
      } finally {
        setSavingProfile(false);
      }
    },
    [descriptionDraft, contactDrafts, profileDiff, profile, userId],
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
      <div className="flex items-start gap-4">
        <Avatar name={profile.name} src={photo} size="lg" />
        <div className="min-w-0 flex-1">
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
        </div>
      </div>

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
            <dt className="text-xs">Cargo</dt>
            <dd className="text-ink">{USER_ROLE_LABEL[user.role]}</dd>
          </div>
          <div>
            <dt className="text-xs">Senha</dt>
            <dd className="text-ink">••••••••</dd>
          </div>
        </dl>
        <p className="text-ink-muted text-xs">
          Cargo e senha são somente leitura. A troca de senha estará disponível em breve.
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-ink text-base font-semibold">Perfil público</h2>

        {editingProfile ? (
          <form className="flex flex-col gap-4" onSubmit={handleSaveProfile} noValidate>
            <Field
              label="Resumo"
              htmlFor={descriptionFieldId}
              error={profileErrors.description}
              hint={`${descriptionDraft.trim().length}/${DESCRIPTION_MAX_LENGTH} caracteres`}
            >
              <Textarea
                id={descriptionFieldId}
                name="description"
                rows={3}
                maxLength={DESCRIPTION_MAX_LENGTH}
                value={descriptionDraft}
                invalid={Boolean(profileErrors.description)}
                onChange={(event) => setDescriptionDraft(event.target.value)}
              />
            </Field>

            <div className="flex flex-col gap-3">
              {CONTACT_KEYS.map((key) => {
                const draft = contactDrafts[key] ?? { value: "", shareWithCommunity: false };
                const error = profileErrors[key];
                const fieldId = `${key}-${contactIdPrefix}`;
                const shareId = `${key}-share-${contactIdPrefix}`;
                return (
                  <div key={key} className="flex flex-col gap-1.5">
                    <Field label={contactLabel(key)} htmlFor={fieldId} error={error}>
                      <Input
                        id={fieldId}
                        name={key}
                        type="text"
                        maxLength={key === "phone" ? PHONE_MAX_LENGTH : CONTACT_VALUE_MAX_LENGTH}
                        value={draft.value}
                        invalid={Boolean(error)}
                        onChange={(event) => setContactDraft(key, { value: event.target.value })}
                      />
                    </Field>
                    <label htmlFor={shareId} className="text-ink-muted flex items-center gap-2 text-xs">
                      <input
                        id={shareId}
                        type="checkbox"
                        className="accent-brand"
                        checked={draft.shareWithCommunity}
                        onChange={(event) =>
                          setContactDraft(key, { shareWithCommunity: event.target.checked })
                        }
                      />
                      Compartilhar com a comunidade
                    </label>
                  </div>
                );
              })}

              <div className="flex flex-col gap-1.5">
                <Field label="E-mail" htmlFor={emailFieldId}>
                  <Input id={emailFieldId} name="email" type="email" value={user.email} readOnly disabled />
                </Field>
                <label htmlFor={emailShareId} className="text-ink-muted flex items-center gap-2 text-xs">
                  <input
                    id={emailShareId}
                    type="checkbox"
                    className="accent-brand"
                    checked={emailShare}
                    onChange={(event) => setEmailShare(event.target.checked)}
                  />
                  Compartilhar e-mail com a comunidade
                </label>
              </div>
            </div>

            <p className="text-ink-muted text-xs">
              O e-mail é usado para login e não pode ser alterado; só a visibilidade é editável por
              aqui.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={savingProfile} disabled={!profileDiff}>
                Salvar
              </Button>
              <Button type="button" variant="ghost" onClick={cancelEditingProfile}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <Avatar name={profile.name} src={photo} />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                <p className="text-ink text-sm">{profile.description || "Sem descrição."}</p>
                <Button type="button" variant="secondary" size="sm" onClick={startEditingProfile}>
                  Editar perfil
                </Button>
              </div>
            </div>

            <dl className="text-ink-muted grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs">E-mail</dt>
                <dd className="text-ink break-all">
                  {user.email}
                  {emailHidden ? (
                    <span className="ml-2">
                      <Badge tone="ink-muted">Não compartilhado</Badge>
                    </span>
                  ) : null}
                </dd>
              </div>

              {contacts.map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs">{contactLabel(key)}</dt>
                  <dd className="text-ink break-all">
                    {isContactLink(key, value) ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand hover:underline"
                      >
                        {value}
                      </a>
                    ) : (
                      value
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            {hiddenContacts.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-ink-muted text-xs">Não compartilhado com a comunidade:</span>
                {hiddenContacts.map((key) => (
                  <Badge key={key} tone="ink-muted">
                    {contactLabel(key)}
                  </Badge>
                ))}
              </div>
            ) : null}
          </>
        )}
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
