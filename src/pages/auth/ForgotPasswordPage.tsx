import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { forgotPassword } from "../../services/auth";
import { apiErrorDetail, apiErrorFields, apiErrorMessage } from "../../utils/apiError";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setDetail(null);
    setSubmitted(false);

    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("Informe seu e-mail");
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError("E-mail inválido");
      return;
    }
    setEmailError(undefined);

    setSubmitting(true);
    try {
      await forgotPassword(trimmed);
      setSubmitted(true);
    } catch (error) {
      const fields = apiErrorFields(error);
      setEmailError(fields.email);
      if (!fields.email) {
        setFormError(apiErrorMessage(error));
        setDetail(apiErrorDetail(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const trimmedEmail = email.trim();
  const resetTo = trimmedEmail
    ? `/redefinir-senha?email=${encodeURIComponent(trimmedEmail)}`
    : "/redefinir-senha";

  return (
    <AuthLayout
      title="Esqueci a senha"
      subtitle="Informe o e-mail da conta. Se ela existir, enviaremos um código para redefinir a senha."
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <Field label="E-mail" htmlFor="email" error={emailError}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            invalid={Boolean(emailError)}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        {formError ? (
          <p role="alert" className="text-danger text-sm">
            {formError}
          </p>
        ) : null}
        {detail ? <p className="text-ink-muted text-xs">{detail}</p> : null}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Enviando..." : "Enviar código"}
        </Button>
      </form>

      {submitted ? (
        <div className="mt-4 flex flex-col gap-1">
          <p role="status" className="text-ink text-sm">
            Se existir uma conta com este e-mail, enviamos um código.
          </p>
          <p className="text-ink-muted text-xs">O código expira em poucos minutos.</p>
          <Link
            to={resetTo}
            state={{ email: trimmedEmail }}
            className="text-brand mt-2 text-sm hover:underline"
          >
            Já tenho o código
          </Link>
        </div>
      ) : null}

      <p className="text-ink-muted mt-4 text-sm">
        Lembrou a senha?{" "}
        <Link to="/login" className="text-brand hover:underline">
          Voltar para o login
        </Link>
      </p>
    </AuthLayout>
  );
}
