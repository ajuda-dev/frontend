import type { UseParticipantsResult } from "../../hooks/useParticipants";
import type { EventItem } from "../../types/api";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Spinner } from "../ui/Spinner";

interface ParticipationZoneProps {
  event: EventItem;
  participation: UseParticipantsResult;
}

// Só os erros das ações desta zona aparecem aqui; os do painel do anfitrião
// (add/remove) ficam com quem os disparou.
const ZONE_FAILURE_KEYS = ["join", "cancel", "accept", "reject"];

function occupancyLabel(confirmedCount: number, maxSlots: number | null): string | null {
  if (maxSlots === null) return null;
  return `${confirmedCount} de ${maxSlots} vagas ocupadas`;
}

export function ParticipationZone({ event, participation }: ParticipationZoneProps) {
  const {
    participants,
    myRow,
    confirmedCount,
    loading,
    error,
    failure,
    isPending,
    join,
    cancel,
    accept,
    reject,
    refetch,
  } = participation;

  if (loading && participants.length === 0) {
    return (
      <Card className="flex justify-center py-6">
        <Spinner />
      </Card>
    );
  }

  if (error && participants.length === 0) {
    const detail = apiErrorDetail(error);
    return (
      <Alert
        variant="error"
        title="Não foi possível carregar a participação"
        action={
          <button type="button" onClick={refetch} className="text-brand text-sm hover:underline">
            Tentar novamente
          </button>
        }
      >
        {apiErrorMessage(error)}
        {detail ? <span className="block text-xs">{detail}</span> : null}
      </Alert>
    );
  }

  const isMentoring = event.category === "MENTORING";
  const maxSlots = event.max_slots ?? null;
  const full = maxSlots !== null && confirmedCount >= maxSlots;
  const occupancy = occupancyLabel(confirmedCount, maxSlots);
  const status = myRow?.status;
  const zoneFailure = failure && ZONE_FAILURE_KEYS.includes(failure.key) ? failure : null;
  const joinButton = (
    <Button
      size="sm"
      disabled={full}
      loading={isPending("join")}
      onClick={() => void join()}
    >
      {full ? "Evento cheio" : "Participar"}
    </Button>
  );

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-ink text-base font-semibold">Sua participação</h2>

      {isMentoring ? (
        <>
          {!myRow ? (
            <p className="text-ink-muted text-sm">
              Mentoria por convite: o anfitrião convida o mentorado — não há auto-inscrição.
            </p>
          ) : null}

          {status === "REQUESTED" ? (
            <div className="flex flex-col gap-3">
              <Badge tone="warning">Convite de mentoria recebido</Badge>
              <p className="text-ink-muted text-sm">
                O anfitrião convidou você para esta mentoria. Aceite para confirmar sua vaga.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" loading={isPending("accept")} onClick={() => void accept()}>
                  Aceitar convite
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={isPending("reject")}
                  onClick={() => void reject()}
                >
                  Recusar
                </Button>
              </div>
            </div>
          ) : null}

          {status === "CONFIRMED" ? (
            <div className="flex flex-col gap-3">
              <Badge tone="brand">
                {myRow?.role === "MENTOR" ? "Você é o mentor" : "Você é o mentorado"}
              </Badge>
              <div>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={isPending("cancel")}
                  onClick={() => void cancel()}
                >
                  Cancelar inscrição
                </Button>
              </div>
            </div>
          ) : null}

          {status === "REJECTED" ? (
            <p className="text-ink-muted text-sm">Você recusou o convite desta mentoria.</p>
          ) : null}

          {status === "CANCELLED" ? (
            <p className="text-ink-muted text-sm">Seu convite de mentoria foi cancelado.</p>
          ) : null}
        </>
      ) : (
        <>
          {!myRow || status === "CANCELLED" || status === "REJECTED" ? (
            <div className="flex flex-col gap-3">
              {status === "CANCELLED" ? (
                <p className="text-ink-muted text-sm">
                  Sua inscrição foi cancelada — você pode participar de novo.
                </p>
              ) : null}
              {status === "REJECTED" ? (
                <p className="text-ink-muted text-sm">
                  Sua inscrição foi recusada — você pode se inscrever de novo.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">{joinButton}</div>
            </div>
          ) : null}

          {status === "REQUESTED" ? (
            <p className="text-ink-muted text-sm">Sua inscrição está pendente de confirmação.</p>
          ) : null}

          {status === "CONFIRMED" ? (
            <div className="flex flex-col gap-3">
              <Badge tone="brand">Você participa</Badge>
              <div>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={isPending("cancel")}
                  onClick={() => void cancel()}
                >
                  Cancelar inscrição
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {occupancy ? <p className="text-ink-muted text-xs">{occupancy}</p> : null}

      {zoneFailure ? <Alert variant="error">{zoneFailure.message}</Alert> : null}
    </Card>
  );
}
