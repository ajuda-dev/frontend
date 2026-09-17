import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../context/useAuth";
import { apiErrorDetail, apiErrorMessage, apiErrorFields } from "../../utils/apiError";
import { validatePersonName } from "../../utils/nameValidation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    const nameError = validatePersonName(name);
    if (nameError) next.name = nameError;

    if (!email.trim()) next.email = "Informe seu e-mail";
    else if (!EMAIL_REGEX.test(email.trim())) next.email = "E-mail inválido";

    if (!password) next.password = "Informe uma senha";
    else if (password.length < MIN_PASSWORD_LENGTH) next.password = "A senha deve ter ao menos 6 caracteres";

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
      await register(name.trim(), email.trim(), password);
      navigate("/confirmar-email", { replace: true });
    } catch (error) {
      const fields = apiErrorFields(error);
      setErrors({ name: fields.name, email: fields.email, password: fields.password });
      if (Object.keys(fields).length === 0) {
        setFormError(apiErrorMessage(error));
        setDetail(apiErrorDetail(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Criar conta" subtitle="Cadastre-se para criar comunidades, eventos e mentorias.">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <Field label="Nome" htmlFor="name" error={errors.name}>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            invalid={Boolean(errors.name)}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

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
            autoComplete="new-password"
            value={password}
            invalid={Boolean(errors.password)}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        {formError ? (
          <p role="alert" className="text-danger text-sm">
            {formError}
          </p>
        ) : null}
        {detail ? <p className="text-ink-muted text-xs">{detail}</p> : null}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Cadastrando..." : "Criar conta"}
        </Button>
      </form>

      <p className="text-ink-muted mt-4 text-sm">
        Já tem conta?{" "}
        <Link to="/login" className="text-brand hover:underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
