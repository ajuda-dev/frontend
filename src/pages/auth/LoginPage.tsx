import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../context/useAuth";
import { githubLoginUrl } from "../../services/auth";
import { apiErrorDetail, apiErrorMessage, apiErrorFields } from "../../utils/apiError";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { from?: string; notice?: string } | null;
  const from = locationState?.from ?? "/";
  const notice = locationState?.notice;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!email.trim()) next.email = "Informe seu e-mail";
    else if (!EMAIL_REGEX.test(email.trim())) next.email = "E-mail inválido";
    if (!password) next.password = "Informe sua senha";
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
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (error) {
      const fields = apiErrorFields(error);
      setErrors({ email: fields.email, password: fields.password });
      if (Object.keys(fields).length === 0) {
        setFormError(apiErrorMessage(error));
        setDetail(apiErrorDetail(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Entrar" subtitle="Acesse sua conta para participar das comunidades.">
      {notice ? (
        <p role="status" className="text-brand mb-4 text-sm">
          {notice}
        </p>
      ) : null}
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

        <Field label="Senha" htmlFor="password" error={errors.password}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            invalid={Boolean(errors.password)}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <p className="text-sm">
          <Link to="/esqueci-senha" className="text-brand hover:underline">
            Esqueci a senha
          </Link>
        </p>

        {formError ? (
          <p role="alert" className="text-danger text-sm">
            {formError}
          </p>
        ) : null}
        {detail ? <p className="text-ink-muted text-xs">{detail}</p> : null}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <span className="bg-line h-px flex-1" />
        <span className="text-ink-muted text-xs">ou</span>
        <span className="bg-line h-px flex-1" />
      </div>

      <a
        href={githubLoginUrl()}
        className="bg-surface-2 text-ink border-line hover:border-brand inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
        </svg>
        Entrar com GitHub
      </a>

      <p className="text-ink-muted mt-4 text-sm">
        Não tem conta?{" "}
        <Link to="/registro" className="text-brand hover:underline">
          Criar conta
        </Link>
      </p>
    </AuthLayout>
  );
}
