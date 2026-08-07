# Radar Unificando — Extensão Chrome

Extensão de Chrome (Manifest V3) que analisa a vaga aberta na página atual e
mostra dicas de ajuste do currículo para passar em triagens de ATS, sem sair do
site da vaga (LinkedIn, Gupy, InHire, portais de empresa, etc.).

Reaproveita a análise ATS já existente no backend do Radar Unificando
(`POST /api/extension/analyze`).

## Como funciona

1. Clique no ícone da extensão na página de uma vaga.
2. O painel extrai o texto principal da página e envia ao backend para análise.
3. Na primeira vez, a extensão pede para conectar sua conta (via
   `chrome.identity.launchWebAuthFlow`), gerando um token de extensão no site.
4. O painel mostra o score, pontos fortes, skills faltando e dicas.

## Desenvolvimento

```bash
npm install
npm run dev        # build de desenvolvimento (carrega em chrome://extensions)
npm run build      # build de produção em dist/
npm test           # testes (extração de texto)
npm run icons      # regenera os ícones placeholder
```

### Carregar a extensão

1. `npm run dev` (ou `npm run build`).
2. Abra `chrome://extensions`, ative o "Modo do desenvolvedor".
3. Clique em "Carregar sem compactação" e selecione a pasta `dist/`.
4. Copie o **ID da extensão** (em `chrome://extensions`) e configure a variável
   `EXTENSION_ORIGIN=chrome-extension://<id>` no `.env` do backend, depois
   reinicie o backend.

## Configuração

A URL do site fica em `src/config.ts` (`SITE_URL`). Em produção, aponte para o
domínio real do Radar Unificando.

## Estrutura

- `src/background.ts` — service worker: conexão (launchWebAuthFlow) e chamada à API.
- `src/content.ts` — content script injetado sob demanda: extrai texto e renderiza o painel.
- `src/panel.tsx` — painel flutuante em Shadow DOM.
- `src/extract.ts` — extração genérica de texto da página.
- `src/storage.ts` — persistência do token em `chrome.storage.local`.