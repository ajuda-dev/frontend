import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../context/useAuth";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshSession } = useAuth();
  const failed = searchParams.get("error") !== null;

  useEffect(() => {
    if (failed) return;
    let active = true;
    void refreshSession().then((current) => {
      if (!active) return;
      navigate(current ? "/" : "/login", { replace: true });
    });
    return () => {
      active = false;
    };
  }, [failed, navigate, refreshSession]);

  if (failed) {
    return (
      <main className="bg-bg text-ink flex min-h-svh flex-col items-center justify-center gap-3 px-4">
        <p className="text-ink text-sm">Não foi possível concluir o login com o provedor.</p>
        <Link to="/login" className="text-brand text-sm hover:underline">
          Voltar para o login
        </Link>
      </main>
    );
  }

  return (
    <main className="bg-bg text-ink flex min-h-svh items-center justify-center px-4">
      <p className="text-ink-muted text-sm">Autenticando…</p>
    </main>
  );
}
