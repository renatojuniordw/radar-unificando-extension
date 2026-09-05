# Checklist de Publicação — Chrome Web Store

Checklist para submeter a extensão **Radar Unificando — Análise de Vagas e Score ATS** (v1.0.2) à Chrome Web Store. Siga na ordem.

## 0. Pré-requisitos

- [ ] Conta de desenvolvedor na Chrome Web Store paga (US$ 5, taxa única).
- [ ] E-mail de autor ativo: `contato@unificando.com.br`.
- [ ] `homepage_url` publicado e acessível: `https://radar.unificando.com.br/extensao`.
- [ ] Política de privacidade publicada em URL pública (use o rascunho `docs/PRIVACY_POLICY.md` e hospede em `https://radar.unificando.com.br/privacidade` ou similar).

## 1. Antes de empacotar (neste repo)

- [ ] `npm test` → **261 testes passando, 0 falhando**.
- [ ] `npm run build` → sem erros de type-check (`tsc --noEmit` cobre os testes).
- [ ] `npm run zip` → gera `radar-unificando-extension-v1.0.2.zip`.
- [ ] Validar o manifest dentro do zip:
  ```bash
  unzip -p radar-unificando-extension-v1.0.2.zip manifest.json
  ```
  - [ ] `version: "1.0.2"`
  - [ ] **sem** `localhost:11010` em `host_permissions`
  - [ ] **sem** bloco `oauth2`
  - [ ] `minimum_chrome_version: "114"`
  - [ ] `web_accessible_resources` **sem** `<all_urls>`
- [ ] Teste manual (Chrome): carregar `dist/` sem compactação, abrir o side panel e confirmar que o indicador de status mostra **Conectado/Desconectado** (não "Verificando…" fixo); conectar/desconectar; analisar vaga no LinkedIn/Gupy/InHire; trocar de vaga para disparar re-análise; verificar badge de score.

## 2. Upload do pacote

- [ ] Acessar o [Developer Dashboard](https://chrome.google.com/webstore/devconsole), criar item ("New item").
- [ ] Enviar `radar-unificando-extension-v1.0.2.zip`.

## 3. Ficha do item (listing)

Use o rascunho `docs/STORE_LISTING.md`:
- [ ] Título e descrição curta (≤ 132 chars).
- [ ] Descrição longa.
- [ ] Categoria: **Productivity** (ou **Developer Tools**).
- [ ] Idioma: **Português (Brasil)**.
- [ ] Keywords (≤ 100 chars no total).
- [ ] Screenshots (1280×800 ou 640×400, até 5) e imagem de promoção (440×280) mostrando o side panel aberto com o resultado da análise.
- [ ] Ícones 16/48/128 (**obrigatório**) e 128×128 (já no pacote, mas conferir na ficha).
- [ ] Link do suporte: `https://radar.unificando.com.br/extensao` (ou e-mail).

## 4. Declarações de privacidade

A extensão **coleta e transmite dados**, então marque o formulário de privacidade corretamente:

- [ ] Declarar que a extensão coleta/envia ao servidor do desenvolvedor:
  - [ ] **Texto da vaga** (descrição extraída da página) e **título da aba** → enviados em `POST /api/extension/analyze` (com token Bearer) para gerar o score ATS.
  - [ ] **Avaliação "Útil?" (sim/não)** → `POST /api/extension/feedback`.
  - [ ] **Clique em curso de afiliado** (skill, plataforma, URL do curso) → `POST /api/track/course-click` (fire-and-forget).
- [ ] Declarar dados armazenados **localmente** no dispositivo (`chrome.storage.local`):
  - [ ] Token de conexão (`extensionToken`).
  - [ ] Histórico de análises (URL, título, score, data — máx. 50 itens).
  - [ ] Cache de análises (TTL de 30 min).
- [ ] Fornecer **política de privacidade** na área apropriada do dashboard (rascunho em `docs/PRIVACY_POLICY.md`).
- [ ] **Não** há coleta de dados pessoais identificáveis (nome, e-mail, localização) por esta extensão.

## 5. Justificativa de permissões (seção "Single purpose" / review)

Preparar justificativa abaixo, para colar nos campos do dashboard se solicitado:

| Permissão | Justificativa |
|---|---|
| `storage` | Persistir token, histórico e cache de análises localmente. |
| `identity` | Login via `chrome.identity.launchWebAuthFlow` (fluxo OAuth no site, sem senha na extensão). |
| `activeTab` | Ler URL/título da aba ativa para enviar ao backend e injetar o content script sob demanda. |
| `sidePanel` | Abrir o painel lateral (API Chrome 114+). |
| `scripting` | Injetar o content script em abas abertas antes da instalação da extensão. |
| `host_permissions` `*.linkedin.com`, `*.gupy.io`, `*.inhire.app`, `*.inhire.com` | Executar o content script que lê apenas a descrição visível da vaga nessas plataformas. |
| `host_permissions` `radar.unificando.com.br` | Chamar a API (`/api/extension/*`) e o fluxo de conexão do próprio serviço. |

**Single purpose:** a extensão tem um único propósito claro — analisar a vaga aberta e sugerir ajustes de currículo para ATS. Não há uso de dados para publicidade, venda ou propósito secundário.

## 6. Pacote de publicação

- [ ] **manifest.json** dentro do zip (conferido na etapa 1).
- [ ] **Ícones** 16/48/128 presentes (já incluídos).
- [ ] **Remover** do zip: `.env`, zips antigos, `node_modules`, código-fonte TS (o build do CRXJS já entrega só o `dist/`).

## 7. Enviar e acompanhar

- [ ] Enviar para revisão ("Submit for review").
- [ ] O revisor pode pedir: esclarecimento sobre o scraping do LinkedIn — explicar que a extensão **só lê a descrição da vaga visível** na página, não automatiza ações, não coleta dados de perfil e nada é vendido.
- [ ] Acompanhar status em "Status: Pending review" (pode levar dias).

---

## Extras sugeridos (não bloqueiam)

- Publicar changelog na aba "More info".
- Configurar público-alvo (todos / específicos).
- Verificar a nota "Verified publisher" (se aplicável à organização).