import { extractJobText } from './extract';
import { onUrlChange } from './spa';

// Guarda anti-duplicação: evita registros duplicados quando o content script é
// injetado sob demanda (chrome.scripting) numa página que já o carregou.
declare global {
  interface Window {
    __radarContentLoaded?: boolean;
  }
}
if (window.__radarContentLoaded) {
  // Já injetado — não registra listeners de novo.
} else {
  window.__radarContentLoaded = true;

  let lastText = '';
  let mutationTimer: number | undefined;

  // Responde ao side panel com o texto extraído da página atual.
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'GET_PAGE_TEXT') {
      const text = extractJobText(document, location.href);
      sendResponse({ text, url: location.href });
    }
  });

  // Notifica o side panel quando o conteúdo muda (só se o texto extraído mudar,
  // evitando spam de mensagens em mutações irrelevantes do DOM).
  function notifyIfChanged(): void {
    const text = extractJobText(document, location.href);
    if (text && text !== lastText) {
      lastText = text;
      chrome.runtime.sendMessage({ type: 'PAGE_CHANGED' });
    }
  }

  // Mudança de URL (SPA): espera o conteúdo novo carregar antes de notificar.
  onUrlChange(() => {
    const start = Date.now();
    const poll = window.setInterval(() => {
      const text = extractJobText(document, location.href);
      if ((text && text !== lastText) || Date.now() - start > 5000) {
        window.clearInterval(poll);
        notifyIfChanged();
      }
    }, 400);
  });

  // Mudança de conteúdo sem mudança de URL (ex.: LinkedIn troca a vaga).
  const observer = new MutationObserver(() => {
    window.clearTimeout(mutationTimer);
    mutationTimer = window.setTimeout(notifyIfChanged, 700);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}