import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { UseParticipantsResult } from "../../hooks/useParticipants";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePageable } from "../../hooks/usePageable";
import type { InvitableRole } from "../../services/eventUser";
import { listUsers } from "../../services/user";
import type { Skill } from "../../types/api";
import { apiErrorDetail, apiErrorMessage } from "../../utils/apiError";
import { PARTICIPATION_ROLE_LABEL } from "../../utils/labels";
import { SkillPicker } from "../skill/SkillPicker";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Input } from "../ui/Input";
import { LoadMoreButton } from "../ui/LoadMoreButton";
import { Modal } from "../ui/Modal";
import { Spinner } from "../ui/Spinner";

interface AddPersonPickerProps {
  participation: UseParticipantsResult;
  inviteRole: InvitableRole;
  onClose: () => void;
}

// Reusa a busca de pessoas do plano 09 (nome + skill do catálogo). O papel do
// convite vem do painel do anfitrião: em MENTORING é o complementar ao de quem
// criou e nos demais eventos é SPEAKER.
export function AddPersonPicker({ participation, inviteRole, onClose }: AddPersonPickerProps) {
  const groupName = useId();
  const [name, setName] = useState("");
  const debouncedName = useDebouncedValue(name, 400);
  const [skill, setSkill] = useState<Skill | null>(null);
  const [selectedId, setSelectedId] = useState("");

  const adding = participation.isPending("add");
  const addFailure = participation.failure?.key === "add" ? participation.failure : null;

  const fetcher = useCallback(
    (page: number) => listUsers({ page, name: debouncedName, skill: skill?.name }),
    [debouncedName, skill],
  );

  const { items, hasNext, loading, error, loadMore, reset } = usePageable(fetcher);

  const filterKey = `${debouncedName}|${skill?.id ?? ""}`;
  const isFirstRun = useRef(true);
  useEffect(() => {
    // O usePageable já carrega a página 1 no mount: só reseta quando o filtro muda.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    setSelectedId("");
    reset();
  }, [filterKey, reset]);

  const detail = apiErrorDetail(error);
  const hasFilters = Boolean(debouncedName || skill);

  async function handleSubmit() {
    if (!selectedId || adding) return;
    const ok = await participation.add(selectedId, inviteRole);
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
          <Button loading={adding} disabled={!selectedId} onClick={() => void handleSubmit()}>
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

        <Field label="Buscar por nome" htmlFor={`${groupName}-name`}>
          <Input
            id={`${groupName}-name`}
            name="person_name"
            value={name}
            placeholder="Ex.: Lucas"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <SkillPicker
          selected={skill}
          onSelect={setSkill}
          label="Filtrar por habilidade"
          hint="A busca é pelo começo do nome da habilidade."
          clearLabel="Todas as habilidades"
          emptyHint="Sem habilidade: a lista mostra todas as pessoas."
        />

        {loading && items.length === 0 ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : null}

        {error && items.length === 0 ? (
          <Alert
            variant="error"
            title="Não foi possível carregar as pessoas"
            action={
              <button type="button" onClick={reset} className="text-brand text-sm hover:underline">
                Tentar novamente
              </button>
            }
          >
            {apiErrorMessage(error)}
            {detail ? <span className="block text-xs">{detail}</span> : null}
          </Alert>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <p className="text-ink-muted text-sm">
            {hasFilters
              ? "Ninguém corresponde a esses filtros."
              : "Ainda não há pessoas cadastradas na plataforma."}
          </p>
        ) : null}

        {items.length > 0 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-ink-muted mb-1 text-sm">Pessoa</legend>
            {items.map((person) => (
              <label
                key={person.id}
                className="bg-surface-2 border-line flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <input
                  type="radio"
                  name={groupName}
                  value={person.id}
                  checked={selectedId === person.id}
                  onChange={() => setSelectedId(person.id)}
                  className="accent-brand"
                />
                <span className="text-ink">{person.name}</span>
                {person.skills.length > 0 ? (
                  <span className="text-ink-muted text-xs">
                    {person.skills.map((entry) => entry.name).join(", ")}
                  </span>
                ) : null}
              </label>
            ))}
          </fieldset>
        ) : null}

        {items.length > 0 && (hasNext || loading) ? (
          <LoadMoreButton hasNext={hasNext} loading={loading} onLoadMore={loadMore} />
        ) : null}

        {addFailure ? <Alert variant="error">{addFailure.message}</Alert> : null}
      </div>
    </Modal>
  );
}
