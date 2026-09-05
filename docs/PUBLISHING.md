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

## 5. Guia "Práticas de privacidade" — textos prontos para copiar e colar

A guia **"Práticas de privacidade"** do dashboard exige: descrição do **propósito único**, **justificativas de cada permissão** e justificativa de **código remoto**, além da confirmação de que o uso de dados obedece às políticas. Copie/cole os textos abaixo em cada campo. (Erros como "É necessário fornecer uma justificativa para X" somem ao preencher esses campos.)

### 5.1 Propósito único (singe purpose)

```
A extensão Radar Unificando analisa, em tempo real, a descrição da vaga aberta
pelo usuário em sites de emprego (LinkedIn, Gupy e InHire) e gera um "score ATS"
com sugestões para otimizar o currículo. A extensão tem um propósito único:
ajudar candidatos a avaliar a aderência do currículo a uma vaga antes de se
candidatar. Não há publicidade, venda de dados nem qualquer outro uso
secundário dos dados coletados.
```

### 5.2 Código remoto

```
A extensão não utiliza código remoto. Todo o código executado é empacotado e
versionado no pacote enviado à loja (build estático gerado por build de
produção). Não há uso de eval, new Function, carregamento de scripts externos
ou CDN em tempo de execução.
```

### 5.3 activeTab

```
Usada para ler a URL e o título da aba ativa quando o usuário clica no ícone da
extensão, e para injetar o content script sob demanda em abas abertas antes da
instalação. O acesso é concedido somente pela ação do usuário (clique no
ícone/painel) e por tempo limitado; nenhum conteúdo de aba é acessado sem ação
do usuário.
```

### 5.4 identity

```
Usada exclusivamente para autenticar o usuário via chrome.identity.launchWebAuthFlow,
abrindo o fluxo de login do site Radar Unificando para obter um token de acesso
próprio da extensão. Nenhuma credencial ou dado de contas de terceiros é
acessado.
```

### 5.5 Permissões de host

```
A extensão precisa de acesso a https://*.linkedin.com/*, https://*.gupy.io/*,
https://*.inhire.app/* e https://*.inhire.com/* para executar o content script
que lê APENAS a descrição da vaga visível ao usuário nessas páginas, e a
https://radar.unificando.com.br/* para chamar a API do serviço (análise de
vaga, feedback) e o fluxo de conexão. Não há <all_urls>: apenas esses domínios,
e nada além da descrição da vaga é lido.
```

### 5.6 scripting

```
Usada para injetar o content script em abas que já estavam abertas antes de a
extensão ser instalada ou atualizada, permitindo analisar vagas sem exigir que
o usuário recarregue a página. A injeção ocorre somente quando o usuário aciona
a extensão.
```

### 5.7 sidePanel

```
Usada para abrir o painel lateral da extensão, onde o usuário visualiza o
resultado da análise, o histórico e a área de conexão. A extensão define o
painel como comportamento padrão ao clicar no ícone da barra de navegação.
```

### 5.8 storage

```
Usada para armazenar localmente no dispositivo do usuário: o token de conexão da
extensão, o histórico de análises (URL, título, score e data — limitado a 50
itens) e um cache temporário de análises (válido por 30 minutos). Nenhum dado
desse armazenamento é compartilhado com terceiros.
```

### 5.9 Confirmação de uso de dados / políticas

Na mesma guia, declarar os dados coletados (conforme seção 4): texto da vaga,
título da aba, avaliação "Útil?", clique em curso de afiliado (enviados ao
servidor do desenvolvedor); token, histórico e cache (locais). Fornecer a URL
da política de privacidade (rascunho em `docs/PRIVACY_POLICY.md`) e confirmar a
adesão às Políticas do programa para desenvolvedores.

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