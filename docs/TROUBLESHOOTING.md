# Solução de Problemas

Guia rápido de diagnóstico dos erros mais comuns da extensão **Radar Unificando**. Para cada sintoma, a causa provável e a ação recomendada.

## Erros exibidos no painel (análise)

### "Sua conta não está conectada" (código `NOT_CONNECTED` / HTTP 401)

- **Causa:** o token de extensão salvo no navegador está ausente, inválido ou foi revogado no servidor. O backend responde `{"error":"Token de extensão inválido ou revogado"}`.
- **Ação:** clicar em **"Conectar conta"** (painel) ou **"Conectar"** (rodapé) e **completar o login** na janela/aba que abre (o fluxo passa por `/login`). Se o token foi revogado, a extensão o remove automaticamente ao receber 401 — basta reconectar.

### "Nenhum currículo encontrado. Importe seu currículo no site primeiro." (código `NO_RESUME` / HTTP 400)

- **Causa:** a conta conectada não tem currículo importado (ou o currículo tem menos de 30 caracteres). O backend retorna 400 antes de analisar.
- **Ação:** clicar em **"Importar currículo"** (link no painel) e importar o currículo no site Radar Unificando. Depois, reanalisar a vaga.

### "Muitas análises em pouco tempo" (código `RATE_LIMITED` / HTTP 429)

- **Causa:** o backend limita a ~20 análises/min por usuário + IP.
- **Ação:** aguardar alguns segundos/minutos e tentar de novo.

### "Não foi possível analisar a vaga: <detalhe>" (código `UNKNOWN` / HTTP 500)

- **Causa:** erro interno no backend (falha na análise IA, etc.).
- **Ação:** tentar mais tarde. Se persistir, reportar ao suporte (`contato@unificando.com.br`) com o detalhe da mensagem.

### "Não encontramos texto de vaga nesta página." (código `NO_TEXT`)

- **Causa:** o extrator não encontrou descrição de vaga na página (página não suportada ou vaga não carregada).
- **Ação:** navegar para uma página de vaga do LinkedIn/Gupy/InHire, aguardar carregar e clicar em **"Reanalisar"**.

## Erros de conexão

### "Não foi possível conectar…" (aviso no painel) ou `[extension] Falha na conexão` no console

- **Causa:** o `launchWebAuthFlow` foi rejeitado — na prática, o login **não foi concluído** (janela fechada, cancelada ou não finalizada). Em desenvolvimento, também pode ocorrer se o backend local não reconhece a origem da extensão.
- **Ação:**
  1. Tentar conectar de novo e **completar o login** na janela do navegador que abre.
  2. Estar logado no site Radar Unificando (em dev: `http://localhost:11010/login`).
  3. Em dev, conferir a variável `EXTENSION_ORIGIN=chrome-extension://<id>` no `.env` do backend (ver README, "Carregar a extensão") e reiniciar o backend.
  4. Verificar que o ID da extensão não mudou (recarregar a extensão após re-build pode mudar o ID em carregamentos por pasta descompactada).

### Console: `WebSocket connection to 'ws://localhost/?token=…' failed` / `'ws://localhost:undefined/?token=…' is invalid`

- **Causa:** **inofensivo**. É o hot-reload (HMR) do Vite tentando conectar dentro da página `chrome-extension://` do side panel durante `npm run dev`; o Chrome não expõe host/porta HTTP para páginas de extensão.
- **Ação:** ignorar. Não afeta o funcionamento da extensão.

## Testar em desenvolvimento (backend local)

1. Suba o backend local (Next.js) — deve responder em `http://localhost:11010`.
2. Com o `.env` da extensão apontando `VITE_SITE_URL=http://localhost:11010`, rode `npm run dev` e carregue `dist/` em `chrome://extensions`.
3. **Faça login** no site local (`http://localhost:11010/login`) e **importe um currículo** — sem isso, toda análise retorna 400 `NO_RESUME`.
4. Configure `EXTENSION_ORIGIN=chrome-extension://<id>` no backend local (README).
5. Conecte a extensão (botão "Conectar") e analise uma vaga.