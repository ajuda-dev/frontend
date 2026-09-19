import { useState } from "react";
import type { UseParticipantsResult } from "../../hooks/useParticipants";
import type { InvitableRole } from "../../services/eventUser";
import type { UserWithSkills } from "../../types/api";
import { PARTICIPATION_ROLE_LABEL } from "../../utils/labels";
import { PersonPicker } from "../people/PersonPicker";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface AddPersonPickerProps {
  participation: UseParticipantsResult;
  inviteRole: InvitableRole;
  onClose: () => void;
}

// Reusa a busca de pessoas do plano 09 (nome + skill do catálogo). O papel do
// convite vem do painel do anfitrião: em MENTORING é o complementar ao de quem
// criou e nos demais eventos é SPEAKER.
export function AddPersonPicker({ participation, inviteRole, onClose }: AddPersonPickerProps) {
  const [selected, setSelected] = useState<UserWithSkills | null>(null);

  const adding = participation.isPending("add");
  const addFailure = participation.failure?.key === "add" ? participation.failure : null;

  async function handleSubmit() {
    if (!selected || adding) return;
    const ok = await participation.add(selected.id, inviteRole);
    if (ok) onClose();
  }

  return (
    <Modal
      open
      title={inviteRole === "SPEAKER" ? "Convidar palestrante" : "Convidar para a mentoria"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={adding}>
            Cancelar
          </Button>
          <Button loading={adding} disabled={!selected} onClick={() => void handleSubmit()}>
            Convidar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p>
          {inviteRole === "SPEAKER"
            ? "Escolha quem vai palestrar neste evento. O convite fica pendente até a pessoa aceitar, recusar ou pedir outro horário."
            : `Escolha quem você quer convidar como ${PARTICIPATION_ROLE_LABEL[inviteRole].toLowerCase()}. O convite fica pendente até a pessoa aceitar.`}
        </p>

        <PersonPicker selected={selected} onSelect={setSelected} />

        {addFailure ? <Alert variant="error">{addFailure.message}</Alert> : null}
      </div>
    </Modal>
  );
}
