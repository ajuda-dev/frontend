export interface OnboardingStep {
  id: string;
  title: string;
  body: string[];
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Bem-vindo ao AjudaDev",
    body: [
      "Aqui você encontra comunidades de tecnologia, eventos e mentoria 1:1.",
      "Este guia rápido mostra as seções principais e como usar cada uma.",
      "Você pode pular agora e reabrir depois em Meu perfil.",
    ],
  },
  {
    id: "communities",
    title: "Comunidades",
    body: [
      "Em Comunidades você explora grupos por nome ou cidade e abre o detalhe de cada uma.",
      "Entre nas que fizerem sentido para você, ou crie a sua.",
      "Para criar ou entrar, o e-mail precisa estar confirmado.",
    ],
  },
  {
    id: "events",
    title: "Eventos e agenda",
    body: [
      "Em Eventos você vê webinars e eventos de comunidade, com filtros por tipo e data.",
      "Abra um evento para se inscrever, ver participantes ou gerenciar o que você organiza.",
      "A Agenda reúne os seus eventos em visão de semana, dia ou mês.",
    ],
  },
  {
    id: "people",
    title: "Pessoas e mentoria",
    body: [
      "Em Pessoas você busca quem ensina ou quer aprender uma skill.",
      "No perfil de alguém, use agendar mentoria para marcar um 1:1.",
      "Convites aparecem no sino; aceite ou recuse pelo próprio evento.",
    ],
  },
  {
    id: "profile",
    title: "Perfil e avisos",
    body: [
      "Em Meu perfil você edita nome, resumo, contatos e habilidades.",
      "O sino no canto do header mostra convites e avisos em tempo real.",
      "Para ver este guia de novo, use o botão em Meu perfil.",
    ],
  },
];
