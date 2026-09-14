import { useState } from "react";
import { approveEvent } from "../../services/event";
import type { EventItem } from "../../types/api";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";

type Decision = "APPROVED" | "REJECTED";

interface EventApprovalControlsProps {
  event: EventItem;
  onDecided: (event: EventItem) => void;
}

export function EventApprovalControls({ event, onDecided }: EventApprovalControlsProps) {
  const [pending, setPending] = useState<Decision | null>(null);
  const [error, setError] = useState<unknown>(null);

  const handle = async (status: Decision) => {
    setPending(status);
    setError(null);
    try {
      const updated = await approveEvent(event.id, status);
      onDecided(updated);
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(null);
    }
  };

  const detail = apiErrorDetail(error);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" loading={pending === "APPROVED"} onClick={() => void handle("APPROVED")}>
          Aprovar
        </Button>
        {/* APPROVED não volta a PENDING e REJECTED → REJECTED é 400: o botão só
            aparece quando a transição existe. */}
        {event.status === "PENDING" ? (
          <Button
            size="sm"
            variant="danger"
            loading={pending === "REJECTED"}
            onClick={() => void handle("REJECTED")}
          >
            Rejeitar
          </Button>
        ) : null}
      </div>

      {error ? (
        <Alert variant="error" title="Não foi possível atualizar a aprovação">
          {apiErrorMessage(error)}
          {detail ? <span className="block text-xs">{detail}</span> : null}
        </Alert>
      ) : null}
    </div>
  );
}
