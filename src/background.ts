import { getToken, setToken, clearToken } from './storage';
import { SITE_URL, API_BASE, CONNECT_PATH } from './config';
import type { AnalyzeResponse } from './types';

// Trigger manual: clicar no ícone pede ao content script da aba ativa para analisar.
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER' }).catch(() => {
    // Content script ainda não injetado (ex.: página carregando) — ignora.
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'ANALYZE') {
    handleAnalyze(String(msg.jobDescription ?? ''))
      .then(sendResponse)
      .catch((err) => sendResponse({ error: String(err) }));
    return true; // resposta assíncrona
  }
});

async function handleAnalyze(jobDescription: string): Promise<AnalyzeResponse> {
  let token = await getToken();
  if (!token) {
    token = await connect();
    if (!token) return { error: 'NOT_CONNECTED' };
  }

  const res = await fetch(`${API_BASE}/extension/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ jobDescription }),
  });

  if (res.status === 401) {
    await clearToken();
    return { error: 'NOT_CONNECTED' };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string }).error;
    if (res.status === 429) return { error: 'RATE_LIMITED' };
    if (res.status === 400) return { error: 'NO_RESUME' };
    return { error: message || 'UNKNOWN' };
  }
  return data as AnalyzeResponse;
}

/** Conecta a conta via launchWebAuthFlow e guarda o token recebido. */
async function connect(): Promise<string | null> {
  const redirectUri = chrome.identity.getRedirectURL();
  const url = `${SITE_URL}${CONNECT_PATH}?redirect_uri=${encodeURIComponent(redirectUri)}`;
  const responseUrl = await chrome.identity.launchWebAuthFlow({ url, interactive: true });
  if (!responseUrl) return null;
  const token = new URL(responseUrl).searchParams.get('token');
  if (token) await setToken(token);
  return token;
}