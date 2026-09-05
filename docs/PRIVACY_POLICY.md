# Política de Privacidade — Extensão Radar Unificando

> Rascunho destinado à publicação no dashboard da Chrome Web Store e no site.
> Publique em uma URL pública (ex.: `https://radar.unificando.com.br/privacidade`) e informe essa URL no formulário de privacidade da loja.

Última atualização: 4 de setembro de 2026

## 1. Visão geral

A extensão **Radar Unificando — Análise de Vagas e Score ATS** (o "Serviço") ajuda quem busca emprego a entender, em tempo real, se o currículo está aderente a uma vaga, mostrando um "score ATS", pontos fortes, skills faltando, dicas de ajuste e cursos recomendados.

Ao instalar e usar a extensão, você concorda com esta política. A extensão **não vende, não aluga e não compartilha seus dados com terceiros** — com exceção do próprio serviço Radar Unificando, necessário para o funcionamento do produto.

## 2. Quais dados coletamos e por quê

### 2.1 Dados enviados ao serviço Radar Unificando (transmissão)

Para gerar a análise ATS, a extensão envia ao servidor do Radar Unificando (`radar.unificando.com.br`):

- **Texto da vaga** — a descrição exibida na página da vaga (LinkedIn, Gupy, InHire) que você está visualizando. É o dado necessário para calcular o score e as sugestões.
- **Título da aba / cargo** — usado para aproximar as recomendações de cursos à vaga.
- **Avaliação de utilidade** ("Útil? Sim/Não") — quando você responde, envia-se apenas o voto.
- **Clique em curso de afiliado** — ao clicar em "Ver curso", enviamos a skill, a plataforma e a URL do curso, para fins de análise de desempenho das recomendações (links de afiliado). Nenhum dado pessoal acompanha esse evento.

A comunicação é feita via HTTPS, com token de autorização da própria extensão.

### 2.2 Dados armazenados localmente (no seu dispositivo)

A extensão usa `chrome.storage.local` para guardar, apenas no seu navegador:

- **Token de conexão** — gerado ao você autorizar a extensão na sua conta Radar Unificando (via fluxo de autenticação do navegador). Não é sua senha; é uma credencial própria da extensão.
- **Histórico de análises** — URL, título, score e data das últimas análises (limitado a 50 itens).
- **Cache de análises** — resultados recentes para evitar re-análises desnecessárias (válidos por 30 minutos).

Você pode apagar o histórico pela própria extensão (botão "Limpar") ou desinstalando a extensão, o que remove os dados locais.

## 3. O que NÃO coletamos

- Nome, e-mail, telefone ou qualquer dado pessoal identificável do usuário.
- Dados de perfil do LinkedIn, conexões, mensagens ou dados de outras pessoas.
- Conteúdo de e-mails, senhas ou dados de formas de pagamento.
- Localização, histórico de navegação, cookies de terceiros ou dados de publicidade.

A extensão não monitora, não vende e não usa seus dados para fins diferentes dos descritos acima.

## 4. Compartilhamento

Não compartilhamos seus dados com terceiros. As únicas comunicações de rede são com o servidor do Radar Unificando (descrito na seção 2.1) e com as plataformas de vaga de onde você mesmo navega (para leitura da descrição).

## 5. Retenção

Os dados locais persistem enquanto a extensão estiver instalada e podem ser removidos por você a qualquer momento. Os dados enviados ao servidor são tratados conforme a política de privacidade do site Radar Unificando e retidos pelo tempo necessário para prestar e melhorar o serviço.

## 6. Segurança

- Todo tráfego usa HTTPS.
- Nenhuma senha é solicitada ou armazenada pela extensão.
- As permissões solicitadas são as mínimas necessárias (veja a lista de permissões no manifesto da extensão).

## 7. Crianças

O Serviço não é destinado a menores de 13 anos e não coleta dados de crianças.

## 8. Alterações nesta política

Podemos atualizar esta política periodicamente. A versão vigente estará sempre disponível nesta URL, com a data de atualização indicada.

## 9. Contato

Dúvidas sobre privacidade: **contato@unificando.com.br**.