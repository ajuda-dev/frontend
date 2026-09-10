import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <main className="bg-bg text-ink flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="font-mono text-brand text-2xl">404</h1>
      <p className="text-ink-muted">Página não encontrada.</p>
      <Link to="/" className="text-brand hover:underline">
        Voltar para o início
      </Link>
    </main>
  );
}
