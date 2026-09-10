import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageSpinner } from "../../components/ui/Spinner";
import { useAuth } from "../../context/useAuth";
import { useMemberships } from "../../hooks/useMemberships";
import { findCommunityById } from "../../services/community";
import type { Community } from "../../types/api";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";
import { formatAddress, formatCep } from "../../utils/format";

interface DetailLocationState {
  community?: Community;
}

export function CommunityDetailPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const memberships = useMemberships(user?.id);

  const fromList = (location.state as DetailLocationState | null)?.community;
  const [community, setCommunity] = useState<Community | null>(
    fromList && fromList.id === id ? fromList : null,
  );
  const [loading, setLoading] = useState(!community);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Comunidade vinda da navegação (state da lista) já está carregada.
    if (community) return;
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
  }, [id, attempt, community]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (loading) return <PageSpinner />;

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Comunidade" />
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
        <PageHeader title="Comunidade" />
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
  const member = memberships.isMember(community.id);
  const pending = memberships.pendingId === community.id;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={community.name}
        description={community.address ? formatAddress(community.address) : "Endereço não informado"}
        actions={
          <>
            {isOwner ? <Badge tone="brand">Você é o criador</Badge> : null}
            {!isOwner && member ? <Badge tone="info">Você é membro</Badge> : null}
          </>
        }
      />

      <Card className="flex flex-col gap-4">
        <p className="text-ink text-sm whitespace-pre-line">{community.description}</p>

        <dl className="text-ink-muted grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs">Cidade/UF</dt>
            <dd className="text-ink">
              {community.address ? `${community.address.city}/${community.address.state}` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs">CEP</dt>
            <dd className="text-ink">
              {community.address ? formatCep(community.address.zip_code) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs">Criada por</dt>
            <dd className="text-ink">{community.owner?.name ?? "responsável não informado"}</dd>
          </div>
          <div>
            <dt className="text-xs">Contato do responsável</dt>
            <dd className="text-ink">{community.owner?.email ?? "—"}</dd>
          </div>
        </dl>
      </Card>

      {memberships.notice ? (
        <Alert variant={memberships.notice.tone === "error" ? "error" : "info"}>
          {memberships.notice.message}
        </Alert>
      ) : null}

      {isOwner ? (
        <p className="text-ink-muted text-sm">
          Você criou esta comunidade, então não há entrada para participar.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {member ? (
            <Button
              variant="secondary"
              loading={pending}
              onClick={() => void memberships.leave(community.id)}
            >
              Sair
            </Button>
          ) : (
            <Button loading={pending} onClick={() => void memberships.join(community.id)}>
              Entrar
            </Button>
          )}
        </div>
      )}

      <Link to="/comunidades" className="text-brand text-sm hover:underline">
        Voltar para a lista
      </Link>
    </div>
  );
}
