# Radar Unificando — Extensão Chrome

Extensão de Chrome (Manifest V3) que analisa a vaga aberta na página atual e
mostra dicas de ajuste do currículo para passar em triagens de ATS. Usa o
**Side Panel** do Chrome: o painel fica na lateral do navegador, acompanha a
aba ativa e re-analisa automaticamente quando você troca de vaga.

Reaproveita a análise ATS do backend do Radar Unificando
(`POST /api/extension/analyze`).

## Funcionalidades

- **Side Panel** — painel lateral persistente; abre com um clique no ícone.
- **Análise ATS** — score (0–100), pontos fortes, skills faltando, dicas e
  checklist do currículo.
- **Score por skill** — barra de aderência por tecnologia, com sugestões.
- **Re-análise automática** — acompanha a aba ativa; re-analisa ao trocar de
  vaga (navegação SPA), mudar a URL ou o conteúdo da página.
- **Botão "Reanalisar"** — re-extrai a página e re-analisa na hora.
- **Badge de score** — mostra o score no ícone da extensão.
- **Histórico local** — últimas análises salvas em `chrome.storage.local`
  (seção colapsável com altura fixa).
- **Cache por URL** — evita re-analisar a mesma vaga por 30 minutos.
- **Copiar dicas** — exporta o resultado como texto formatado.
- **Feedback de utilidade** — avaliação (sim/não) enviada ao backend.
- **Extratores por site** — LinkedIn, Gupy, InHire e um extrator genérico.

## Como funciona

1. Clique no ícone da extensão → abre o **Side Panel**.
2. O painel pede o texto da página ao content script (`GET_PAGE_TEXT`).
3. Na primeira vez, conecta sua conta via `chrome.identity.launchWebAuthFlow`,
   gerando um token de extensão no site.
4. O backend analisa o texto e o painel mostra o resultado.

O content script não renderiza UI: ele apenas extrai o texto da página e
notifica o painel quando o conteúdo muda.

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

> Abas que já estavam abertas antes de recarregar a extensão são suportadas: o
> background injeta o content script sob demanda via `chrome.scripting`.

## Configuração

A URL do site fica em `src/config.ts` (`SITE_URL`). Em produção, aponte para o
domínio real do Radar Unificando.

## Estrutura

```
src/
  background.ts      → Service worker: abre o side panel, roteia mensagens,
                       chama a API e injeta o content script sob demanda.
  content.ts         → Content script: extrai o texto da página e notifica
                       mudanças (PAGE_CHANGED).
  sidepanel.tsx      → UI do Side Panel (análise, conexão, histórico).
  extract.ts         → Fachada de extração (escolhe o extrator pela URL).
  extractors/        → Extratores por site (LinkedIn, Gupy, InHire, genérico).
  api.ts             → Cliente HTTP do backend (analyze, feedback).
  connect.ts         → Fluxo de conexão (launchWebAuthFlow + token).
  badge.ts           → Badge de score no ícone.
  spa.ts             → Detecção de mudança de URL em SPAs.
  storage/           → Persistência local (token, histórico, cache).
  format.ts          → Formata o resultado para texto (copiar dicas).
  clipboard.ts       → Helper de cópia com fallback.
  types.ts           → Tipos e protocolo de mensagens.
```

Veja [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) para o protocolo de
mensagens e os fluxos em detalhe.
