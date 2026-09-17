import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { resetPassword } from "../../services/auth";
import { apiErrorDetail, apiErrorFields, apiErrorMessage } from "../../utils/apiError";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

interface FieldErrors {
  email?: string;
  code?: string;
  newPassword?: string;
}

interface ResetLocationState {
  email?: string;
}

function normalizeCode(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const stateEmail = (location.state as ResetLocationState | null)?.email;
  const queryEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(stateEmail ?? queryEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!email.trim()) next.email = "Informe seu e-mail";
    else if (!EMAIL_REGEX.test(email.trim())) next.email = "E-mail inválido";
    if (!code.trim()) next.code = "Informe o código";
    if (!newPassword) next.newPassword = "Informe a nova senha";
    else if (newPassword.length < MIN_PASSWORD_LENGTH) {
      next.newPassword = "A senha deve ter ao menos 6 caracteres";
    }
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setDetail(null);

    const localErrors = validate();
    setErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    setSubmitting(true);
    try {
      await resetPassword({
        email: email.trim(),
        code: normalizeCode(code),
        newPassword,
      });
      navigate("/login", {
        replace: true,
        state: { notice: "Senha atualizada. Entre com a nova senha." },
      });
    } catch (error) {
      const fields = apiErrorFields(error);
      setErrors({
        email: fields.email,
        code: fields.code,
        newPassword: fields.newPassword,
      });
      if (Object.keys(fields).length === 0) {
        setFormError(apiErrorMessage(error));
        setDetail(apiErrorDetail(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Redefinir senha"
      subtitle="Use o código enviado por e-mail para criar uma nova senha."
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <Field label="E-mail" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            invalid={Boolean(errors.email)}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field label="Código" htmlFor="code" error={errors.code} hint="O código expira em poucos minutos.">
          <Input
            id="code"
            name="code"
            type="text"
            inputMode="text"
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={6}
            value={code}
            invalid={Boolean(errors.code)}
            className="uppercase tracking-widest"
            onChange={(event) => setCode(normalizeCode(event.target.value))}
          />
        </Field>

        <Field label="Nova senha" htmlFor="newPassword" error={errors.newPassword}>
          <Input
            id="newPassword"
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
        {detail ? <p className="text-ink-muted text-xs">{detail}</p> : null}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando..." : "Redefinir senha"}
        </Button>
      </form>

      <p className="text-ink-muted mt-4 text-sm">
        Não recebeu o código?{" "}
        <Link to="/esqueci-senha" className="text-brand hover:underline">
          Solicitar de novo
        </Link>
      </p>
    </AuthLayout>
  );
}
