import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { changePassword } from "../../services/auth";
import { apiErrorFields, apiErrorMessage, hasApiMessage } from "../../utils/apiError";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Input } from "../ui/Input";

const MIN_PASSWORD_LENGTH = 6;
const WRONG_CURRENT_PASSWORD = "Senha atual incorreta";

interface FieldErrors {
  currentPassword?: string;
  newPassword?: string;
}

interface ChangePasswordFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ChangePasswordForm({ onSuccess, onCancel }: ChangePasswordFormProps) {
  const currentFieldId = useId();
  const newFieldId = useId();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!currentPassword) next.currentPassword = "Informe a senha atual";
    if (!newPassword) next.newPassword = "Informe a nova senha";
    else if (newPassword.length < MIN_PASSWORD_LENGTH) {
      next.newPassword = "A senha deve ter ao menos 6 caracteres";
    } else if (newPassword === currentPassword) {
      next.newPassword = "A nova senha deve ser diferente da atual";
    }
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const localErrors = validate();
    setErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    setSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      onSuccess();
    } catch (error) {
      const fields = apiErrorFields(error);
      const next: FieldErrors = {
        currentPassword: fields.currentPassword,
        newPassword: fields.newPassword,
      };
      if (hasApiMessage(error, "invalid credentials")) {
        next.currentPassword = next.currentPassword ?? WRONG_CURRENT_PASSWORD;
      }
      setErrors(next);
      if (!next.currentPassword && !next.newPassword) {
        setFormError(apiErrorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
      <Field label="Senha atual" htmlFor={currentFieldId} error={errors.currentPassword}>
        <Input
          id={currentFieldId}
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          invalid={Boolean(errors.currentPassword)}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </Field>
      <Field label="Nova senha" htmlFor={newFieldId} error={errors.newPassword}>
        <Input
          id={newFieldId}
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          invalid={Boolean(errors.newPassword)}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </Field>
      {formError ? (
        <p role="alert" className="text-danger text-sm">
          {formError}
        </p>
      ) : null}
      <p className="text-ink-muted text-xs">
        Esqueceu a senha atual?{" "}
        <Link to="/esqueci-senha" className="text-brand hover:underline">
          Recupere por e-mail
        </Link>
        .
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={submitting}>
          Salvar senha
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
