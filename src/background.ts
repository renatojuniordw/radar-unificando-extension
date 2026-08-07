import { analyzeJob, rewriteSection, sendFeedback } from './api';
import { getOrConnectToken, connect, disconnect } from './connect';
import { setScoreBadge, clearBadge } from './badge';
import { getToken } from './storage';
import { addHistory, getCachedAnalysis, setCachedAnalysis } from './storage';
import type {
  AnalyzeResponse,
  ExtensionMessage,
  FeedbackResponse,
  RewriteResponse,
} from './types';

// Clique no ícone pede ao content script da aba ativa para analisar.
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER' }).catch(() => {
    // Content script ainda não injetado (ex.: página carregando) — ignora.
  });
});

async function getActiveTab(): Promise<{ url: string; title: string } | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;
  return { url: tab.url, title: tab.title ?? tab.url };
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

async function handleRewrite(section: string, jobDescription: string): Promise<RewriteResponse> {
  const token = await getOrConnectToken();
  if (!token) return { error: 'NOT_CONNECTED' };
  return rewriteSection(token, section, jobDescription);
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

    case 'REWRITE':
      handleRewrite(String(msg.section ?? ''), String(msg.jobDescription ?? ''))
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

    case 'OPEN_PANEL':
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER' }).catch(() => {});
        }
        sendResponse({ ok: true });
      });
      return true;

    default:
      sendResponse({ error: 'UNKNOWN' });
      break;
  }
});