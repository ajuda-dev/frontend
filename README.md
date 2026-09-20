# AjudaDev — Frontend

SPA em React da plataforma AjudaDev (comunidades, eventos e mentoria 1:1). Consome **somente** a API REST do [backend](https://github.com/ajuda-dev/backend).

## Precisa do backend rodando

Este repositório **não sobe a API**. Sem o backend no ar o front não autentica, não lista nada e o proxy `/v1` aponta para um servidor inexistente.

1. Clone [ajuda-dev/backend](https://github.com/ajuda-dev/backend).
2. Siga o README de lá (Go, PostgreSQL, `.env`).
3. Suba a API (`go run ./cmd/api`). O padrão local é `http://127.0.0.1:8080` (`GET /health`).

Só então inicie este SPA.

## Onde colocar a URL do backend

Copie `.env.example` para `.env` (gitignored):

```env
API_HOST=127.0.0.1
API_PORT=8080
# VITE_API_BASE_URL=/v1
```

| Variável | Quando usar |
| --- | --- |
| `API_HOST` e `API_PORT` | **Dev local** (`npm run dev`). O Vite faz proxy de `/v1` para `http://$API_HOST:$API_PORT`. |
| `VITE_API_BASE_URL` | O que o **navegador** chama. Em local deixe `/v1` (ou omita). Em produção, defina **antes** do `npm run build` se a API estiver em outra origem (ex.: `https://api.exemplo.com/v1`). |

Se for usar **Entrar com GitHub**, no `.env` do **backend** a URL de retorno do OAuth precisa ser a deste SPA (Vite usa a porta **5173**, não 3000):

```env
OAUTH_FRONTEND_URL=http://127.0.0.1:5173
```

## Rodar local

Pré-requisitos: **Node.js 22+**, npm, e o backend já escutando. No Windows deste projeto use `npm.cmd`.

```bash
cp .env.example .env
npm.cmd install
npm.cmd run dev
```

Abra [http://127.0.0.1:5173](http://127.0.0.1:5173).

Outros comandos: `npm.cmd run build`, `npm.cmd run test`, `npm.cmd run lint`.
