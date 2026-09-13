import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { CommunityForm } from "../../components/community/CommunityForm";
import type { CommunityFormValues } from "../../components/community/CommunityForm";
import { Alert } from "../../components/ui/Alert";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageSpinner } from "../../components/ui/Spinner";
import { useAuth } from "../../context/useAuth";
import { findCommunityById, updateCommunity } from "../../services/community";
import type { Community } from "../../types/api";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";
import { canAtLeast } from "../../utils/roles";

export function EditCommunityPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const found = await findCommunityById(id, controller.signal);
        if (controller.signal.aborted) return;
        setCommunity(found);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(caught);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void run();
    return () => controller.abort();
  }, [id, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  const handleUpdate = useCallback(
    async (values: CommunityFormValues) => {
      const updated = await updateCommunity(id, values);
      navigate(`/comunidades/${id}`, { replace: true, state: { community: updated, updated: true } });
    },
    [id, navigate],
  );

  if (loading) return <PageSpinner />;

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Editar comunidade" />
        <Alert
          variant="error"
          title="Não foi possível carregar a comunidade"
          action={
            <button type="button" onClick={retry} className="text-brand text-sm hover:underline">
              Tentar novamente
            </button>
          }
        >
          {apiErrorMessage(error)}
          {apiErrorDetail(error) ? (
            <span className="block text-xs">{apiErrorDetail(error)}</span>
          ) : null}
        </Alert>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Editar comunidade" />
        <EmptyState
          title="Comunidade não encontrada."
          description="O endereço acessado não corresponde a nenhuma comunidade do catálogo."
          action={
            <Link to="/comunidades" className="text-brand text-sm hover:underline">
              Voltar para a lista
            </Link>
          }
        />
      </div>
    );
  }

  const isOwner = Boolean(user && community.owner && community.owner.id === user.id);
  const canManage = isOwner || canAtLeast(user?.role, "MODERATOR");

  if (!canManage) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Editar comunidade" description={community.name} />
        <Alert variant="error" title="Você não pode alterar esta comunidade">
          Apenas o responsável, moderadores e administradores podem alterar uma comunidade.
        </Alert>
        <Link to={`/comunidades/${community.id}`} className="text-brand text-sm hover:underline">
          Voltar para a comunidade
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Editar comunidade"
        description="Altere o nome, a descrição e o endereço da comunidade."
      />

      <CommunityForm
        initialName={community.name}
        initialDescription={community.description}
        initialAddress={community.address}
        submitLabel="Salvar alterações"
        cancelTo={`/comunidades/${community.id}`}
        onSubmit={handleUpdate}
      />
    </div>
  );
}
