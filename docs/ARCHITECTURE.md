# Arquitetura da Extensão

## Visão geral

A extensão usa o **Chrome Side Panel API** (Manifest V3). O painel lateral é uma
página de extensão persistente que não tem acesso ao DOM da página da vaga —
ela depende do **content script** para extrair o texto. O **service worker**
(background) roteia as mensagens e faz as chamadas ao backend.

```
┌─────────────┐   GET_PAGE_TEXT   ┌─────────────┐   chrome.tabs.sendMessage   ┌──────────────┐
│  Side Panel │ ────────────────► │  Background │ ─────────────────────────► │ Content      │
│ (UI, React) │                   │ (SW/roteador│                             │ script       │
│             │ ◄──────────────── │  + API)     │ ◄───────────────────────── │ (extrai texto│
└─────────────┘   { text, url }   └─────────────┘      PAGE_CHANGED           │ + notifica)  │
        │                                │                                   └──────────────┘
        │   ANALYZE / FEEDBACK /         │
        │   GET_STATUS / CONNECT/...     ▼
        │                         ┌─────────────┐
        └───────────────────────► │   Backend   │  POST /api/extension/*
                                 └─────────────┘
```

## Protocolo de mensagens

Mensagens trocadas via `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage`
(tipadas em `src/shared/types/messages.ts`):

| Mensagem | Origem → Destino | Descrição |
|----------|------------------|-----------|
| `GET_PAGE_TEXT` | Side panel → Background → Content | Pede o texto da página; responde `{ text, url }`. |
| `PAGE_CHANGED` | Content → Side panel | O conteúdo extraído mudou; o painel re-analisa. |
| `ANALYZE` | Side panel → Background | Chama `POST /api/extension/analyze`. |
| `FEEDBACK` | Side panel → Background | Envia avaliação (sim/não) ao backend. |
| `GET_STATUS` | Side panel → Background | Verifica se há token de extensão salvo. |
| `CONNECT` | Side panel → Background | Executa o fluxo de conexão (`launchWebAuthFlow`). |
| `DISCONNECT` | Side panel → Background | Remove o token salvo. |

## Módulos

| Módulo | Responsabilidade |
|--------|------------------|
| `background/index.ts` | Abre o side panel no clique do ícone (`setPanelBehavior`), roteia mensagens, chama a API, aplica o badge, grava histórico/cache e injeta o content script sob demanda. |
| `content/index.ts` | Extrai o texto com `extractJobText` e responde `GET_PAGE_TEXT`. Detecta mudanças de URL (via `content/spa.ts`) e de conteúdo (via MutationObserver) e notifica com `PAGE_CHANGED`, só quando o texto extraído muda. Tem guarda anti-duplicação (`window.__radarContentLoaded`). |
| `sidepanel/index.tsx` | UI do painel: análise, status de conexão, histórico colapsável e botão "Reanalisar". Re-analisa em `tabs.onActivated`, `tabs.onUpdated` (URL) e `PAGE_CHANGED`. |
| `content/extract.ts` + `content/extractors/` | Fachada `extractJobText(doc, url)` que delega ao extrator do site (`JobExtractor`), com fallback para o genérico. Novos sites são adicionados sem alterar os existentes (OCP). |
| `background/api.ts` | Cliente HTTP do backend (`analyzeJob`, `sendFeedback`), mapeando erros para códigos conhecidos. |
| `background/connect.ts` | Conexão via `chrome.identity.launchWebAuthFlow` e persistência do token. |
| `background/badge.ts` | Badge de score no ícone (verde/amarelo/vermelho por faixa). |
| `content/spa.ts` | `onUrlChange(cb)`: patcheia `history.pushState/replaceState` + `popstate` + polling. |
| `shared/storage/` | `token.ts`, `history.ts`, `cache.ts` — persistência em `chrome.storage.local`. |
| `sidepanel/format.ts` | `formatResultToText` para o botão "Copiar dicas". |
| `sidepanel/clipboard.ts` | `copyText` com fallback para `document.execCommand`. |

## Fluxos

### Análise

1. Usuário clica no ícone → `openPanelOnActionClick` abre o side panel.
2. O painel envia `GET_PAGE_TEXT`; o background repassa ao content script da aba
   ativa (injetando-o sob demanda se necessário).
3. O painel envia `ANALYZE`; o background chama `/api/extension/analyze`,
   aplica o badge e grava histórico/cache.
4. O painel renderiza score, skills, pontos fortes, dicas e checklist.

### Conexão

1. Sem token salvo, o painel mostra "Conectar".
2. `CONNECT` → background roda `launchWebAuthFlow` apontando para
   `/extensao/conectar?redirect_uri=...` do site.
3. O site emite um token único (armazenado com hash no backend) e redireciona de
   volta com `?token=...`; o background salva no `chrome.storage.local`.

### Re-análise automática

O painel re-analisa quando (a) a aba ativa muda (`tabs.onActivated`), (b) a URL
muda (`tabs.onUpdated`), (c) o content script detecta mudança de conteúdo
(`PAGE_CHANGED`), ou (d) o usuário clica em **"Reanalisar"**. Para evitar
analisar conteúdo parcial em SPAs, o content script só notifica quando o texto
extraído **difere** do anterior.

## Injeção sob demanda

Abas abertas antes de recarregar a extensão não têm o content script. O
background resolve isso em `GET_PAGE_TEXT`: tenta `chrome.tabs.sendMessage` e, se
falhar, injeta o content script via `chrome.scripting.executeScript` usando o
caminho declarado no manifest (`chrome.runtime.getManifest().content_scripts`),
re-tentando até 3 vezes.

## Backend (endpoints de extensão)

| Rota | Descrição |
|------|-----------|
| `POST /api/extension/analyze` | Analisa a vaga contra o currículo do usuário (auth por token Bearer, rate limit 20/min). |
| `POST /api/extension/feedback` | Registra avaliação de utilidade. |
| `GET /extensao/conectar` | Página autenticada que emite o token de extensão. |

O middleware valida o `Origin` contra `EXTENSION_ORIGIN=chrome-extension://<id>`
no `.env` do backend.
