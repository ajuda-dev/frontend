import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmModal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageSpinner } from "../../components/ui/Spinner";
import { useAuth } from "../../context/useAuth";
import { deleteUser, getUserProfile, getUserSkills } from "../../services/user";
import type { ConfigVisibility, SkillUser, UserProfile } from "../../types/api";
import { apiErrorDetail, apiErrorFields, apiErrorMessage } from "../../utils/apiError";
import { SKILL_LEVEL_COLOR, SKILL_LEVEL_LABEL } from "../../utils/labels";

const CONTACT_LABELS: Record<string, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  otherlink: "Outro link",
  photo: "Foto",
  phone: "Telefone",
};

function contactLabel(key: string): string {
  return CONTACT_LABELS[key] ?? key;
}

function isLink(key: string, value: string): boolean {
  return key === "github" || key === "linkedin" || key === "otherlink" || /^https?:\/\//.test(value);
}

function contactEntries(config: ConfigVisibility): [string, string][] {
  return Object.entries(config)
    .filter(([key, entry]) => key !== "email" && entry.value.trim() !== "")
    .map(([key, entry]) => [key, entry.value]);
}

export function PersonProfilePage() {
  const { userId = "" } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<SkillUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [deleteStep, setDeleteStep] = useState<"closed" | "confirm" | "sure">("closed");
  const [deleting, setDeleting] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);

  useEffect(() => {
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

  // Só ADMIN exclui usuário (os demais cargos não veem o caminho) e nunca o próprio perfil.
  const canDeleteUser = Boolean(user && profile && user.role === "ADMIN" && user.id !== profile.id);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setDeleteErrors([]);
    try {
      await deleteUser(userId);
      navigate("/pessoas", { replace: true });
    } catch (caught) {
      setDeleteStep("closed");
      // 400 de vínculos ativos vem com uma cause por vínculo: todas entram na tela.
      const causes = Object.values(apiErrorFields(caught));
      setDeleteErrors(causes.length > 0 ? causes : [apiErrorMessage(caught)]);
    } finally {
      setDeleting(false);
    }
  }, [userId, navigate]);

  if (loading) return <PageSpinner />;

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Perfil" />
        <Alert
          variant="error"
          title="Não foi possível carregar o perfil"
          action={
            <button type="button" onClick={retry} className="text-brand text-sm hover:underline">
              Tentar novamente
            </button>
          }
        >
          {apiErrorMessage(error)}
          {detail ? <span className="block text-xs">{detail}</span> : null}
        </Alert>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Perfil" />
        <EmptyState
          title="Usuário não encontrado."
          description="O endereço acessado não corresponde a nenhum usuário da plataforma."
          action={
            <Link to="/pessoas" className="text-brand text-sm hover:underline">
              Voltar para a lista
            </Link>
          }
        />
      </div>
    );
  }

  const isSelf = Boolean(user && user.id === profile.id);
  const contacts = contactEntries(profile.configVisibility);
  const hiddenContacts = isSelf
    ? Object.entries(profile.configVisibility).filter(
        ([key, entry]) => key !== "email" && !entry.shareWithCommunity,
      )
    : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={profile.name}
        description={profile.description || "Sem descrição."}
        actions={
          isSelf ? (
            <>
              <Badge tone="brand">Este é você</Badge>
              <Link to="/perfil" className="text-brand text-sm hover:underline">
                Ir para meu perfil
              </Link>
            </>
          ) : null
        }
      />

      <Card className="flex flex-col gap-4">
        <h2 className="text-ink text-base font-semibold">Contato</h2>

        <dl className="text-ink-muted grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs">E-mail</dt>
            <dd className="text-ink">
              {profile.email ? (
                profile.email
              ) : (
                <span className="text-ink-muted">E-mail não compartilhado</span>
              )}
            </dd>
          </div>

          {contacts.map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs">{contactLabel(key)}</dt>
              <dd className="text-ink break-all">
                {isLink(key, value) ? (
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
            {hiddenContacts.map(([key]) => (
              <Badge key={key} tone="ink-muted">
                {contactLabel(key)}
              </Badge>
            ))}
          </div>
        ) : null}
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="text-ink text-base font-semibold">Habilidades</h2>

        {skills.length === 0 ? (
          <EmptyState
            title="Ainda não cadastrou habilidades."
            description="Quando esta pessoa cadastrar habilidades, elas aparecem aqui com o nível de domínio."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {skills.map((entry) => (
              <li
                key={entry.id}
                className="bg-surface border-line flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <span className="text-ink text-sm">{entry.skill?.name ?? "Habilidade"}</span>
                <Badge tone={SKILL_LEVEL_COLOR[entry.level]}>{SKILL_LEVEL_LABEL[entry.level]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canDeleteUser ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="danger" onClick={() => setDeleteStep("confirm")}>
            Excluir usuário
          </Button>
        </div>
      ) : null}

      {deleteErrors.length > 0 ? (
        <Alert variant="error" title="Não foi possível excluir o usuário">
          <ul className="list-disc pl-5">
            {deleteErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <ConfirmModal
        open={deleteStep !== "closed"}
        title="Excluir usuário"
        description={
          deleteStep === "sure"
            ? `Tenho certeza? ${profile.name} será excluído em definitivo e não poderá voltar.`
            : `Excluir ${profile.name}? Vínculos ativos (comunidades, eventos ou participações) impedem a exclusão.`
        }
        confirmLabel={deleteStep === "sure" ? "Tenho certeza, excluir" : "Excluir"}
        loading={deleting}
        onConfirm={() => {
          if (deleteStep === "confirm") {
            setDeleteStep("sure");
            return;
          }
          void handleDelete();
        }}
        onClose={() => setDeleteStep("closed")}
      />
    </div>
  );
}
