import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import { Input } from "../ui/Input";
import { ConfirmModal } from "../ui/Modal";
import { createSkill, deleteSkill, updateSkill } from "../../services/skill";
import type { Skill } from "../../types/api";
import { apiErrorDetail, apiErrorMessage, apiErrorFields } from "../../utils/apiError";

export interface SkillAdminActions {
  editingId: string | null;
  onEdit: (skill: Skill) => void;
  onRemove: (skill: Skill) => void;
}

interface SkillAdminPanelProps {
  onCreated: (skill: Skill) => void;
  onUpdated: (skill: Skill) => void;
  onDeleted: (skillId: string) => void;
  // A lista fica fora do painel; o painel entrega as ações por habilidade
  // através deste render prop, para os botões viverem em cada item.
  children: (actions: SkillAdminActions) => ReactNode;
}

export function SkillAdminPanel({
  onCreated,
  onUpdated,
  onDeleted,
  children,
}: SkillAdminPanelProps) {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editing, setEditing] = useState<Skill | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const [removing, setRemoving] = useState<Skill | null>(null);
  const [deleting, setDeleting] = useState(false);

  function reportError(error: unknown, setFieldError: (message: string) => void) {
    const fields = apiErrorFields(error);
    if (fields.name) {
      setFieldError(fields.name);
      return;
    }
    setFormError(apiErrorMessage(error));
    setDetail(apiErrorDetail(error));
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setDetail(null);
    setNameError(undefined);

    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Informe o nome da habilidade");
      return;
    }

    setCreating(true);
    try {
      const created = await createSkill(trimmed);
      setName("");
      onCreated(created);
    } catch (error) {
      reportError(error, setNameError);
    } finally {
      setCreating(false);
    }
  }

  function startEditing(skill: Skill) {
    setEditing(skill);
    setEditName(skill.name);
    setEditError(undefined);
    setFormError(null);
    setDetail(null);
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setEditError(undefined);
    setFormError(null);
    setDetail(null);

    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError("Informe o nome da habilidade");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateSkill(editing.id, trimmed);
      setEditing(null);
      onUpdated(updated);
    } catch (error) {
      reportError(error, setEditError);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!removing) return;
    setDeleting(true);
    setFormError(null);
    setDetail(null);
    try {
      await deleteSkill(removing.id);
      onDeleted(removing.id);
      setRemoving(null);
    } catch (error) {
      setRemoving(null);
      setFormError(apiErrorMessage(error));
      setDetail(apiErrorDetail(error));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-ink text-base font-semibold">Administrar habilidades</h2>
        <p className="text-ink-muted text-sm">
          Cadastre, renomeie e arquive habilidades do catálogo. O nome é salvo em caixa alta e
          aceita letras, números, espaço e os sinais . # + _ -
        </p>
      </div>

      <form className="flex flex-col gap-3" onSubmit={handleCreate} noValidate>
        <Field label="Nova habilidade" htmlFor="new-skill" error={nameError}>
          <Input
            id="new-skill"
            name="name"
            value={name}
            maxLength={50}
            placeholder="Ex.: GOLANG"
            invalid={Boolean(nameError)}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <div>
          <Button type="submit" loading={creating}>
            Cadastrar habilidade
          </Button>
        </div>
      </form>

      {formError ? (
        <Alert variant="error">
          {formError}
          {detail ? <span className="block text-xs">{detail}</span> : null}
        </Alert>
      ) : null}

      {editing ? (
        <form
          className="border-line flex flex-col gap-3 rounded-md border p-3"
          onSubmit={handleUpdate}
          noValidate
        >
          <Field label={`Renomear ${editing.name}`} htmlFor="edit-skill" error={editError}>
            <Input
              id="edit-skill"
              name="name"
              value={editName}
              maxLength={50}
              invalid={Boolean(editError)}
              onChange={(event) => setEditName(event.target.value)}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={saving}>
              Salvar
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}

      <ConfirmModal
        open={Boolean(removing)}
        title="Arquivar habilidade"
        description={
          removing
            ? `A habilidade ${removing.name} sai do catálogo e é removida do perfil de todos os usuários que a possuem. Esta ação é irreversível.`
            : ""
        }
        confirmLabel="Arquivar"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onClose={() => setRemoving(null)}
      />

      {children({
        editingId: editing?.id ?? null,
        onEdit: startEditing,
        onRemove: setRemoving,
      })}
    </Card>
  );
}
