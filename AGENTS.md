# AGENTS.md — Frontend AjudaDev

## Overview

Frontend SPA (React) do backend `github.com/ajuda-dev/backend` (plataforma de comunidades dev/tech com eventos e mentoria 1:1). Consome exclusivamente a API REST do backend; não acessa banco nem ViaCEP diretamente.

Planos de implementação: `C:\Users\Lucas\dev\ajudadev\docs\implementacao\frontend\` (00 visão geral + 01–11). Contratos da API: `C:\Users\Lucas\dev\go\backend\docs\swagger.yaml` (fonte oficial — nunca inventar campos/endpoints).

## Stack

- **Build/dev:** Vite 8 + TypeScript (strict), scripts via npm
- **UI:** React 19 + Tailwind CSS v4 (CSS-first: `@theme` em `src/index.css`, sem tailwind.config)
- **Rotas:** React Router v8 (imports de `react-router`; `routes.tsx` é a fonte única de rotas)
- **HTTP:** axios (instância única `src/services/api.ts`, `baseURL` = `VITE_API_BASE_URL` ou `/v1`)
- **Testes:** Vitest + @testing-library/react + jest-dom (config `test:` no `vite.config.ts`)
- **Lint:** oxlint (`npm run lint`)

## Como rodar

- Dev: `npm.cmd run dev` (porta 5173; proxy `/v1` → `http://localhost:8080` — backend deve estar rodando: `go run ./cmd/api` em `C:\Users\Lucas\dev\go\backend`).
- Build: `npm.cmd run build` (tsc -b + vite build). Testes: `npm.cmd run test`. Lint: `npm.cmd run lint`.
- No Windows deste projeto use `npm.cmd` (execução de scripts PowerShell está desabilitada).

## Convenções

- **Idioma:** código/rotas/arquivos em inglês; todo texto visível em **pt-BR**.
- **Identidade visual:** tema dark-only com tokens `@theme` (`bg-bg`, `bg-surface`, `bg-surface-2`, `border-line`, `text-ink`, `text-ink-muted`, `text-brand` #31f9a9, `danger/warning/info`). Primitivas e páginas usam **somente** classes dos tokens — nenhuma cor Tailwind solta (slate/emerald etc.). Logo: wordmark `<AJUDA-DEV/>` em `font-mono text-brand`; asset em `public/logo-ajudadev.png`.
- **Contratos:** tipos de API somente em `src/types/api.ts`, espelhando as definitions `dto.*` do swagger.yaml do backend. `UserSummary.token` aparece vazio em respostas aninhadas — ignorar fora de login/register.
- **Camadas:** páginas (`src/pages/<feature>`) → hooks (`src/hooks`) → services (`src/services/<area>.ts`, um módulo por área) → `services/api.ts`. Componentes compartilhados em `src/components/ui` (primitivas) e `src/components/<feature>`.
- **Erros da API:** corpo `rest_err` tipado em `ApiErrorBody`; tradução de mensagens para pt-BR e `FIELD_LABELS` em `src/utils/apiError.ts` (tabela única — toda mensagem nova vista deve ser adicionada lá).
- **Datas:** sempre via helpers de `src/utils/format.ts` (fuso fixo `America/Sao_Paulo`); enviar `toISOString()`. Nunca formatar manualmente.
- **Paginação:** padrão backend `page`/`limit` + `{data, has_next}`; UI usa "Carregar mais" (`usePageable`), nunca pagina numerada.
- **Sessão/autorização:** localStorage `ajudadev.token` / `ajudadev.user`; gates de UI por `src/utils/roles.ts` (`roleRank`, `canAtLeast`), espelhando `authorization.go` do backend.
- **Enums:** constantes + labels pt-BR em `src/types/api.ts` / `src/utils/labels.ts` (valores exatos do backend: USER/MODERATOR/ADMIN; COMMUNITY_EVENT/MENTORING/WEBINAR; ONLINE/INPERSON/HYBRID; HOST/MENTOR/MENTEE/SPEAKER/ATTENDEE; REQUESTED/CONFIRMED/REJECTED/CANCELLED; WANT_TO_LEARN/LEARN_AND_TEACH/TEACH).
- Sem comentários desnecessários no código; comentários apenas para "porquê" (contornos de limitações da API).

## Verificação obrigatória por entrega

`npm.cmd run lint` && `npm.cmd run build` && `npm.cmd run test` verdes, com `tsc` strict sem erros.
