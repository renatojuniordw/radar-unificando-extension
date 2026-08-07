import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Radar Unificando — Análise de Vaga',
  version: '0.1.0',
  description:
    'Analisa a vaga aberta na página e mostra dicas de ajuste do currículo para passar em triagens de ATS.',
  action: {
    default_title: 'Analisar vaga',
  },
  permissions: ['identity', 'storage', 'activeTab'],
  host_permissions: ['<all_urls>'],
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content.ts'],
      run_at: 'document_idle',
    },
  ],
  oauth2: {
    client_id: 'radar-unificando-extension',
    scopes: [],
  },
  icons: {
    16: 'public/icons/icon16.png',
    48: 'public/icons/icon48.png',
    128: 'public/icons/icon128.png',
  },
});