import { PageHeader } from "../components/ui/PageHeader";

export function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Você entrou"
        description="Comunidades, eventos e mentoria — as seções chegam nos próximos passos."
      />
      <p className="text-ink-muted text-sm">
        Use o menu do usuário no topo para sair quando quiser.
      </p>
    </div>
  );
}
