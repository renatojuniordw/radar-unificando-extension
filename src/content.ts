import { extractJobText } from './extract';
import { renderPanel, isPanelOpen } from './panel';
import { onUrlChange } from './spa';

function analyzeCurrentPage(): void {
  const text = extractJobText(document, location.href);
  renderPanel(text);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'TRIGGER') {
    analyzeCurrentPage();
    sendResponse({ ok: true });
  }
});

// Re-analisa automaticamente quando a URL muda em SPAs e o painel está aberto.
onUrlChange(() => {
  if (isPanelOpen()) analyzeCurrentPage();
});