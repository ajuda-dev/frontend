import { Link } from "react-router";
import { EmptyState } from "../components/ui/EmptyState";

export function NotFoundPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-mono text-brand text-2xl">404</h1>
      <EmptyState
        title="Página não encontrada."
        description="O endereço acessado não existe ou foi movido."
        action={
          <Link to="/" className="text-brand text-sm hover:underline">
            Voltar para o início
          </Link>
        }
      />
    </div>
  );
}
