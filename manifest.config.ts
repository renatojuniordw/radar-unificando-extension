import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest((env) => ({
  manifest_version: 3,
  name: "Radar Unificando — Análise de Vagas e Score ATS",
  short_name: "Radar Unificando",
  version: "1.0.2",
  author: { email: "contato@unificando.com.br" },
  homepage_url: "https://radar.unificando.com.br/extensao",
  description:
    "Analise vagas no Gupy, LinkedIn e InHire em tempo real. Veja seu score ATS e dicas personalizadas para otimizar seu currículo.",
  action: {
    default_title: "Analisar vaga no Radar Unificando",
    default_icon: "public/icons/icon48.png",
  },
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
  minimum_chrome_version: "114",
  permissions: ["identity", "storage", "activeTab", "sidePanel", "scripting"],
  host_permissions: [
    "https://*.linkedin.com/*",
    "https://*.gupy.io/*",
    "https://*.inhire.app/*",
    "https://*.inhire.com/*",
    "https://radar.unificando.com.br/*",
    // Apenas desenvolvimento: servidor local da API não entra no build de produção.
    ...(env.command === "serve" ? ["http://localhost:11010/*"] : []),
  ],
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: [
        "https://*.linkedin.com/*",
        "https://*.gupy.io/*",
        "https://*.inhire.app/*",
        "https://*.inhire.com/*",
      ],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],
  icons: {
    16: "public/icons/icon16.png",
    48: "public/icons/icon48.png",
    128: "public/icons/icon128.png",
    512: "public/icons/icon512.png",
  },
}));
