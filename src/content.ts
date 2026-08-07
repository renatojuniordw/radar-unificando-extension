import { extractJobText } from './extract';
import { renderPanel } from './panel';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'TRIGGER') {
    const text = extractJobText(document);
    renderPanel(text);
    sendResponse({ ok: true });
  }
});