import { analyzeJob, sendFeedback } from './api';
import { getOrConnectToken, connect, disconnect } from './connect';
import { setScoreBadge, clearBadge } from './badge';
import { getToken, addHistory, getCachedAnalysis, setCachedAnalysis } from './storage';
import type { AnalyzeResponse, ExtensionMessage, FeedbackResponse } from './types';

// Clique no ícone abre o side panel automaticamente.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

async function getActiveTab(): Promise<{ id: number; url: string; title: string } | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) return null;
  return { id: tab.id, url: tab.url, title: tab.title ?? tab.url };
}

/**
 * Obtém o texto da página ativa. Se o content script não estiver injetado
 * (ex.: aba aberta antes de recarregar a extensão), injeta sob demanda via
 * chrome.scripting e re-tenta.
 */
/** Caminho do content script declarado no manifest (funciona em dev e produção). */
function getContentScriptFile(): string | null {
  const manifest = chrome.runtime.getManifest();
  return manifest.content_scripts?.[0]?.js?.[0] ?? null;
}

async function getPageTextFromActiveTab(): Promise<{ text: string; url: string } | null> {
  const tab = await getActiveTab();
  if (!tab) return null;

  const contentScriptFile = getContentScriptFile();

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_TEXT' });
      if (res?.text) return { text: res.text, url: res.url ?? tab.url };
    } catch {
      // Content script ainda não injetado.
    }
    if (attempt === 0 && contentScriptFile) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [contentScriptFile],
        });
      } catch {
        // Página restrita (chrome:// etc.) — não injeta.
      }
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

async function handleAnalyze(jobDescription: string): Promise<AnalyzeResponse> {
  const tab = await getActiveTab();

  if (tab) {
    const cached = await getCachedAnalysis(tab.url);
    if (cached) return cached;
  }

  const token = await getOrConnectToken();
  if (!token) return { error: 'NOT_CONNECTED' };

  const result = await analyzeJob(token, jobDescription);
  if ('error' in result) return result;

  await setScoreBadge(result.analysis.score);
  if (tab) {
    await setCachedAnalysis(tab.url, result);
    await addHistory({
      url: tab.url,
      title: tab.title,
      score: result.analysis.score,
      date: new Date().toISOString(),
    });
  }
  return result;
}

async function handleFeedback(rating: boolean, comment?: string): Promise<FeedbackResponse> {
  const token = await getOrConnectToken();
  if (!token) return { error: 'NOT_CONNECTED' };
  return sendFeedback(token, rating, comment);
}

chrome.runtime.onMessage.addListener((msg: ExtensionMessage, _sender, sendResponse) => {
  switch (msg?.type) {
    case 'ANALYZE':
      handleAnalyze(String(msg.jobDescription ?? ''))
        .then(sendResponse)
        .catch((err) => sendResponse({ error: String(err) }));
      return true;

    case 'FEEDBACK':
      handleFeedback(Boolean(msg.rating), msg.comment)
        .then(sendResponse)
        .catch((err) => sendResponse({ error: String(err) }));
      return true;

    case 'GET_STATUS':
      getToken()
        .then((token) => sendResponse({ connected: Boolean(token) }))
        .catch(() => sendResponse({ connected: false }));
      return true;

    case 'CONNECT':
      connect()
        .then((token) => sendResponse({ connected: Boolean(token) }))
        .catch(() => sendResponse({ connected: false }));
      return true;

    case 'DISCONNECT':
      disconnect()
        .then(() => clearBadge())
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;

    case 'GET_PAGE_TEXT':
      getPageTextFromActiveTab()
        .then((res) => sendResponse(res ?? { text: '', url: '' }))
        .catch(() => sendResponse({ text: '', url: '' }));
      return true;

    case 'PAGE_CHANGED':
      // Apenas o side panel reage; o background ignora.
      break;

    default:
      sendResponse({ error: 'UNKNOWN' });
      break;
  }
});