import { useState } from "react";
import { Link } from "react-router";
import type { UseParticipantsResult } from "../../hooks/useParticipants";
import type { EventItem } from "../../types/api";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";
import {
  PARTICIPATION_ROLE_COLOR,
  PARTICIPATION_ROLE_LABEL,
  PARTICIPATION_STATUS_COLOR,
  PARTICIPATION_STATUS_LABEL,
} from "../../utils/labels";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import { AddPersonPicker } from "./AddPersonPicker";

interface HostPanelProps {
  event: EventItem;
  participation: UseParticipantsResult;
  currentUserId: string | null;
}

// Painel de gestão do evento, restrito ao owner (a página decide a visibilidade).
// A lista mostra papel e status de cada linha; o mentor da própria mentoria
// aparece como "Você" e não ganha ações.
export function HostPanel({ event, participation, currentUserId }: HostPanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const {
    participants,
    confirmedCount,
    loading,
    error,
    failure,
    isPending,
    remove,
    refetch,
    clearFailure,
  } = participation;

  const isMentoring = event.category === "MENTORING";
  const maxSlots = event.max_slots ?? null;
  const confirmedMentee = participants.some(
    (entry) => entry.role === "MENTEE" && entry.status === "CONFIRMED",
  );
  const inviteBlocked = isMentoring && confirmedMentee;
  const removeFailure = failure?.key.startsWith("remove:") ? failure : null;
  const detail = apiErrorDetail(error);

  function openPicker() {
    clearFailure();
    setPickerOpen(true);
  }

  function closePicker() {
    setPickerOpen(false);
    clearFailure();
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-ink text-base font-semibold">Painel do anfitrião</h2>
          <p className="text-ink-muted text-xs">
            {isMentoring
              ? "Você é o mentor desta mentoria. Convide o mentorado para completar as vagas."
              : "Adicione palestrantes e acompanhe as inscrições do evento."}
            {maxSlots !== null ? ` ${confirmedCount} de ${maxSlots} vagas ocupadas.` : ""}
          </p>
        </div>

        <Button size="sm" onClick={openPicker} disabled={inviteBlocked}>
          {isMentoring ? "Convidar mentorado" : "Adicionar palestrante"}
        </Button>
      </div>

      {inviteBlocked ? (
        <p className="text-ink-muted text-sm">
          Mentoria já tem mentorado — não é possível convidar outro.
        </p>
      ) : null}

      {loading && participants.length === 0 ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : null}

      {error && participants.length === 0 ? (
        <Alert
          variant="error"
          title="Não foi possível carregar os participantes"
          action={
            <button type="button" onClick={refetch} className="text-brand text-sm hover:underline">
              Tentar novamente
            </button>
          }
        >
          {apiErrorMessage(error)}
          {detail ? <span className="block text-xs">{detail}</span> : null}
        </Alert>
      ) : null}

      {!loading && !error && participants.length === 0 ? (
        <p className="text-ink-muted text-sm">Nenhum participante ainda.</p>
      ) : null}

      {participants.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {participants.map((entry) => {
            const self = entry.user_id === currentUserId;
            const removing = isPending(`remove:${entry.user_id}`);
            return (
              <li
                key={entry.id}
                className="bg-surface border-line flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <div className="flex flex-col gap-1">
                  <Link
                    to={`/pessoas/${entry.user_id}`}
                    className="text-ink hover:text-brand text-sm font-medium"
                  >
                    {entry.user?.name ?? "Participante"}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={PARTICIPATION_ROLE_COLOR[entry.role]}>
                      {PARTICIPATION_ROLE_LABEL[entry.role]}
                    </Badge>
                    <Badge tone={PARTICIPATION_STATUS_COLOR[entry.status]}>
                      {PARTICIPATION_STATUS_LABEL[entry.status]}
                    </Badge>
                  </div>
                </div>

                {self ? (
                  <Badge tone="ink-muted">Você</Badge>
                ) : entry.status === "REQUESTED" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={removing}
                    onClick={() => void remove(entry.user_id)}
                  >
                    Cancelar convite
                  </Button>
                ) : entry.status === "CONFIRMED" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={removing}
                    onClick={() => void remove(entry.user_id)}
                  >
                    Remover
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {removeFailure ? <Alert variant="error">{removeFailure.message}</Alert> : null}

      {pickerOpen ? (
        <AddPersonPicker event={event} participation={participation} onClose={closePicker} />
      ) : null}
    </section>
  );
}
