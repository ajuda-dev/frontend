import { useState } from "react";
import type { UseParticipantsResult } from "../../hooks/useParticipants";
import type { EventItem } from "../../types/api";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";
import { isEventApproved } from "../../utils/events";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Spinner } from "../ui/Spinner";
import { Textarea } from "../ui/Textarea";
import { ParticipantComment } from "./ParticipantComment";

interface ParticipationZoneProps {
  event: EventItem;
  participation: UseParticipantsResult;
}

// Só os erros das ações desta zona aparecem aqui; os do painel do anfitrião
// (add/remove) ficam com quem os disparou.
const ZONE_FAILURE_KEYS = ["join", "cancel", "accept", "reject"];

const COMMENT_MAX = 500;

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

  const [rejecting, setRejecting] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [rejectLocalError, setRejectLocalError] = useState<string | null>(null);

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
  // Evento não aprovado: join e aceite de convite respondem 400 no backend, então a
  // UI avisa antes em vez de deixar o usuário bater no erro.
  const approved = isEventApproved(event);
  const approvalNote = (
    <p className="text-ink-muted text-sm">
      As inscrições abrem quando o evento for aprovado pela comunidade.
    </p>
  );
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

  function openRejectForm() {
    setRejecting(true);
    setRejectComment("");
    setRejectLocalError(null);
  }

  function closeRejectForm() {
    setRejecting(false);
    setRejectComment("");
    setRejectLocalError(null);
  }

  async function confirmReject() {
    const trimmed = rejectComment.trim();
    if (!trimmed) {
      setRejectLocalError("Informe o motivo da recusa");
      return;
    }
    if (trimmed.length > COMMENT_MAX) {
      setRejectLocalError(`O comentário deve ter no máximo ${COMMENT_MAX} caracteres`);
      return;
    }
    setRejectLocalError(null);
    const ok = await reject(trimmed);
    if (ok) closeRejectForm();
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-ink text-base font-semibold">Sua participação</h2>

      {isMentoring ? (
        <>
          {!myRow ? (
            <p className="text-ink-muted text-sm">
              Mentoria por convite: quem criou o evento convida a outra pessoa — não há
              auto-inscrição.
            </p>
          ) : null}

          {status === "REQUESTED" ? (
            <div className="flex flex-col gap-3">
              <Badge tone="warning">Convite de mentoria recebido</Badge>
              <p className="text-ink-muted text-sm">
                Você foi convidado para esta mentoria como{" "}
                {myRow?.role === "MENTOR" ? "mentor" : "mentorado"}. Aceite para confirmar sua vaga.
              </p>
              {rejecting ? (
                <div className="flex flex-col gap-2">
                  <label htmlFor="reject-comment" className="text-ink text-sm font-medium">
                    Motivo da recusa
                  </label>
                  <Textarea
                    id="reject-comment"
                    value={rejectComment}
                    onChange={(event) => {
                      setRejectComment(event.target.value);
                      setRejectLocalError(null);
                    }}
                    maxLength={COMMENT_MAX}
                    rows={3}
                    placeholder="Explique brevemente por que não pode participar"
                    invalid={Boolean(rejectLocalError)}
                    disabled={isPending("reject")}
                  />
                  <p className="text-ink-muted text-xs">
                    {rejectComment.trim().length}/{COMMENT_MAX}
                  </p>
                  {rejectLocalError ? <Alert variant="error">{rejectLocalError}</Alert> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      loading={isPending("reject")}
                      onClick={() => void confirmReject()}
                    >
                      Confirmar recusa
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending("reject")}
                      onClick={closeRejectForm}
                    >
                      Voltar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={!approved}
                    loading={isPending("accept")}
                    onClick={() => void accept()}
                  >
                    Aceitar convite
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={isPending("reject")}
                    onClick={openRejectForm}
                  >
                    Recusar
                  </Button>
                </div>
              )}
              {/* Recusar continua liberado: REQUESTED → REJECTED não depende de aprovação. */}
              {!approved ? approvalNote : null}
            </div>
          ) : null}

          {status === "CONFIRMED" ? (
            <div className="flex flex-col gap-3">
              <Badge tone="brand">
                {myRow?.role === "MENTOR" ? "Você é o mentor" : "Você é o mentorado"}
              </Badge>
              {myRow ? <ParticipantComment entry={myRow} category={event.category} /> : null}
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
            <div className="flex flex-col gap-2">
              <p className="text-ink-muted text-sm">Você recusou o convite desta mentoria.</p>
              {myRow ? <ParticipantComment entry={myRow} category={event.category} /> : null}
            </div>
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
                <div className="flex flex-col gap-1">
                  <p className="text-ink-muted text-sm">
                    Sua inscrição foi recusada — você pode se inscrever de novo.
                  </p>
                  {myRow ? <ParticipantComment entry={myRow} category={event.category} /> : null}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">{approved ? joinButton : null}</div>
              {!approved ? approvalNote : null}
            </div>
          ) : null}

          {status === "REQUESTED" ? (
            <p className="text-ink-muted text-sm">Sua inscrição está pendente de confirmação.</p>
          ) : null}

          {status === "CONFIRMED" ? (
            <div className="flex flex-col gap-3">
              <Badge tone="brand">Você participa</Badge>
              {myRow ? <ParticipantComment entry={myRow} category={event.category} /> : null}
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
