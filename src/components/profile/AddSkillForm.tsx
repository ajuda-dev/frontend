import { useId, useState } from "react";
import type { FormEvent } from "react";
import { SkillPicker } from "../skill/SkillPicker";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import { Select } from "../ui/Select";
import { apiErrorBody } from "../../services/api";
import type { Skill, SkillLevel } from "../../types/api";
import { SKILL_LEVELS } from "../../types/api";
import { apiErrorMessage } from "../../utils/apiError";
import { SKILL_LEVEL_LABEL } from "../../utils/labels";

interface AddSkillFormProps {
  onAdd: (skill: Skill, level: SkillLevel) => Promise<void>;
}

// A API responde 400 quando a linha (skill, usuário) já existe; a saída é ajustar
// o nível na linha existente, não insistir no cadastro.
function isDuplicateSkillError(error: unknown): boolean {
  const body = apiErrorBody(error);
  const messages = [body?.message, ...(body?.causes ?? []).map((cause) => cause.message)];
  return messages.some((message) => message?.trim().toLowerCase() === "user already has this skill");
}

export function AddSkillForm({ onAdd }: AddSkillFormProps) {
  const levelId = useId();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [level, setLevel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!skill) {
      setError("Escolha uma habilidade do catálogo.");
      return;
    }
    if (!level) {
      setError("Escolha o nível de domínio.");
      return;
    }

    setSubmitting(true);
    try {
      await onAdd(skill, level as SkillLevel);
      setSkill(null);
      setLevel("");
    } catch (caught) {
      setError(
        isDuplicateSkillError(caught)
          ? "Você já tem esta habilidade. Para mudar o nível, use o seletor na linha dela abaixo."
          : apiErrorMessage(caught),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <h2 className="text-ink text-base font-semibold">Adicionar habilidade</h2>

        <SkillPicker
          selected={skill}
          onSelect={setSkill}
          label="Habilidade"
          hint="Busca pelo começo do nome da habilidade."
          clearLabel="Nenhuma habilidade"
          emptyHint="Escolha uma habilidade do catálogo para adicionar."
        />

        <Field label="Nível de domínio" htmlFor={levelId}>
          <Select id={levelId} value={level} onChange={(event) => setLevel(event.target.value)}>
            <option value="">Selecione o nível</option>
            {SKILL_LEVELS.map((option) => (
              <option key={option} value={option}>
                {SKILL_LEVEL_LABEL[option]}
              </option>
            ))}
          </Select>
        </Field>

        {error ? <Alert variant="error">{error}</Alert> : null}

        <div>
          <Button type="submit" loading={submitting}>
            Adicionar habilidade
          </Button>
        </div>
      </form>
    </Card>
  );
}
