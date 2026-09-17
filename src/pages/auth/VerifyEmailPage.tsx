import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../context/useAuth";
import { apiErrorDetail, apiErrorFields, apiErrorMessage } from "../../utils/apiError";

function normalizeCode(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function VerifyEmailPage() {
  const { user, verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { from?: string } | null;
  const from =
    locationState?.from && locationState.from !== "/confirmar-email" ? locationState.from : "/";

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setDetail(null);
    setResendNotice(null);

    const trimmed = normalizeCode(code);
    if (!trimmed) {
      setCodeError("Informe o código");
      return;
    }
    setCodeError(undefined);

    setSubmitting(true);
    try {
      await verifyEmail(trimmed);
      navigate(from, { replace: true });
    } catch (error) {
      const fields = apiErrorFields(error);
      setCodeError(fields.code);
      if (!fields.code) {
        setFormError(apiErrorMessage(error));
        setDetail(apiErrorDetail(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setFormError(null);
    setDetail(null);
    setResendNotice(null);
    setResending(true);
    try {
      await resendVerification();
      setResendNotice("Enviamos um novo código");
    } catch (error) {
      setFormError(apiErrorMessage(error));
      setDetail(apiErrorDetail(error));
    } finally {
      setResending(false);
    }
  }

  if (!user) return null;
  if (user.emailVerified) return <Navigate to="/" replace />;

  return (
    <AuthLayout
      title="Confirmar e-mail"
      subtitle={`Enviamos um código para ${user.email}. O código expira em poucos minutos.`}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <Field label="Código" htmlFor="code" error={codeError} hint="6 caracteres (letras e números).">
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
            invalid={Boolean(codeError)}
            className="uppercase tracking-widest"
            onChange={(event) => setCode(normalizeCode(event.target.value))}
          />
        </Field>

        {formError ? (
          <p role="alert" className="text-danger text-sm">
            {formError}
          </p>
        ) : null}
        {detail ? <p className="text-ink-muted text-xs">{detail}</p> : null}
        {resendNotice ? (
          <p role="status" className="text-brand text-sm">
            {resendNotice}
          </p>
        ) : null}

        <Button type="submit" disabled={submitting || resending}>
          {submitting ? "Confirmando..." : "Confirmar e-mail"}
        </Button>
      </form>

      <p className="text-ink-muted mt-4 text-sm">
        Não recebeu o código?{" "}
        <button
          type="button"
          className="text-brand hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          disabled={resending || submitting}
          onClick={() => {
            void handleResend();
          }}
        >
          {resending ? "Reenviando..." : "Reenviar código"}
        </button>
      </p>
    </AuthLayout>
  );
}
