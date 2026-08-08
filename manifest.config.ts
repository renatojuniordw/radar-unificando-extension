import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Radar Unificando — Análise de Vagas e Score ATS",
  short_name: "Radar Unificando",
  version: "0.1.0",
  author: { email: "contato@radarunificando.com.br" },
  homepage_url: "https://radarunificando.com.br/extensao",
  description:
    "Analise vagas no Gupy, LinkedIn e InHire em tempo real. Veja seu score ATS, palavras-chave de IA faltando no currículo e receba dicas personalizadas para passar em triagens automatizadas.",
  action: {
    default_title: "Analisar vaga no Radar Unificando",
    default_icon: "public/icons/icon48.png",
  },
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
  permissions: ["identity", "storage", "activeTab", "sidePanel", "scripting"],
  host_permissions: ["<all_urls>"],
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],
  oauth2: {
    client_id: "radar-unificando-extension",
    scopes: [],
  },
  icons: {
    16: "public/icons/icon16.png",
    48: "public/icons/icon48.png",
    128: "public/icons/icon128.png",
    512: "public/icons/icon512.png",
  },
});
