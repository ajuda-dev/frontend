import { useNavigate } from "react-router";
import { EmailVerificationGate } from "../../components/auth/EmailVerificationGate";
import { CommunityForm } from "../../components/community/CommunityForm";
import type { CommunityFormValues } from "../../components/community/CommunityForm";
import { PageHeader } from "../../components/ui/PageHeader";
import { createCommunity } from "../../services/community";

export function NewCommunityPage() {
  const navigate = useNavigate();

  async function handleCreate(values: CommunityFormValues) {
    const created = await createCommunity(values);
    navigate(`/comunidades/${created.id}`, { replace: true, state: { community: created } });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nova comunidade"
        description="Cadastre o endereço e descreva a comunidade para publicá-la no catálogo. No padrão da plataforma, cada pessoa pode criar até 5 comunidades — moderadores, administradores e a configuração do servidor podem ter limites diferentes."
      />

      <EmailVerificationGate>
        <CommunityForm
          submitLabel="Criar comunidade"
          cancelTo="/comunidades"
          onSubmit={handleCreate}
        />
      </EmailVerificationGate>
    </div>
  );
}
