import { Link } from "react-router";

export function EmailVerificationBanner() {
  return (
    <div role="status" className="border-warning bg-surface border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-2">
        <p className="text-ink-muted text-sm">
          Confirme seu e-mail para aproveitar tudo da plataforma.{" "}
          <Link to="/confirmar-email" className="text-brand hover:underline">
            Confirmar e-mail
          </Link>
        </p>
      </div>
    </div>
  );
}
