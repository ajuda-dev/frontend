import { Link } from "react-router";
import type { Community } from "../../types/api";
import { formatAddress, formatCep } from "../../utils/format";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";

interface CommunityCardProps {
  community: Community;
  isMember?: boolean;
}

export function CommunityCard({ community, isMember = false }: CommunityCardProps) {
  const { address, owner } = community;
  const location = address
    ? `${address.city}/${address.state} · CEP ${formatCep(address.zip_code)}`
    : "Endereço não informado";

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-ink text-base font-semibold">
          <Link to={`/comunidades/${community.id}`} state={{ community }} className="hover:text-brand">
            {community.name}
          </Link>
        </h2>
        {isMember ? <Badge tone="brand">Você é membro</Badge> : null}
      </div>

      <p className="text-ink-muted line-clamp-3 text-sm">{community.description}</p>

      <dl className="text-ink-muted flex flex-col gap-1 text-xs">
        <div className="flex gap-1">
          <dt className="sr-only">Localização</dt>
          <dd>{location}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="sr-only">Criada por</dt>
          <dd>criada por {owner?.name ?? "responsável não informado"}</dd>
        </div>
      </dl>

      {address ? (
        <p className="text-ink-muted text-xs">{formatAddress(address)}</p>
      ) : null}

      <Link to={`/comunidades/${community.id}`} state={{ community }} className="text-brand text-sm hover:underline">
        Ver detalhes
      </Link>
    </Card>
  );
}
