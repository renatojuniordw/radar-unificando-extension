import { useEffect, useRef, useState } from 'react';
import type { AnalyzeErrorCode, AnalyzeResponse, AtsResult } from '../shared/types';
import { getHistory, clearHistory, type AnalysisHistoryEntry } from '../shared/storage';
import { errorMessage } from './utils';

export type PanelState =
  | { status: 'loading' }
  | { status: 'done'; result: AtsResult }
  | { status: 'error'; code: AnalyzeErrorCode; message: string };

export function useAnalysis() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [state, setState] = useState<PanelState>({ status: 'loading' });
  const [currentUrl, setCurrentUrl] = useState('');
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const lastTextRef = useRef('');
  const requestIdRef = useRef(0);
  const connectedRef = useRef<boolean | null>(null);

  function runAnalysis(text: string, requestId: number) {
    setState({ status: 'loading' });
    chrome.runtime.sendMessage({ type: 'ANALYZE', jobDescription: text }, (res: AnalyzeResponse) => {
      if (requestId !== requestIdRef.current) return; // resposta obsoleta
      if (!res) {
        setState({ status: 'error', code: 'UNKNOWN', message: 'Sem resposta da extensão.' });
        return;
      }
      if ('error' in res) {
        setState({ status: 'error', code: res.error as AnalyzeErrorCode, message: errorMessage(res.error as AnalyzeErrorCode) });
        return;
      }
      setState({ status: 'done', result: res });
    });
  }

  async function analyzeActiveTab(force = false) {
    const requestId = ++requestIdRef.current;
    const res = await chrome.runtime.sendMessage({ type: 'GET_PAGE_TEXT' });
    if (requestId !== requestIdRef.current) return; // navegou de novo
    const text = res?.text;
    if (!text) {
      setState({ status: 'error', code: 'NO_TEXT', message: 'Não encontramos texto de vaga nesta página.' });
      return;
    }
    setCurrentUrl(res.url ?? '');
    if (!force && text === lastTextRef.current) return;
    lastTextRef.current = text;
    runAnalysis(text, requestId);
  }

  function refreshStatus() {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
      const isConnected = Boolean(res?.connected);
      connectedRef.current = isConnected;
      setConnected(isConnected);
    });
    getHistory().then(setHistory);
  }

  useEffect(() => {
    refreshStatus();
    analyzeActiveTab(true);

    // Sem conexão, não re-analisa automaticamente: o login é uma ação explícita
    // (botão "Conectar"), então os listeners ficam em silêncio após desconectar.
    const isActive = () => connectedRef.current !== false;
    const onActivated = () => {
      if (isActive()) analyzeActiveTab(false);
    };
    const onUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.url && isActive()) analyzeActiveTab(false);
    };
    const onMessage = (msg: { type?: string }) => {
      if (msg?.type === 'PAGE_CHANGED' && isActive()) analyzeActiveTab(false);
    };
    // Rede de segurança: reflete qualquer mudança de token na UI, mesmo que
    // ela não tenha vindo da resposta do próprio connect().
    const onStorageChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== 'local' || !('extensionToken' in changes)) return;
      refreshStatus();
      if (changes.extensionToken.newValue) analyzeActiveTab(true);
    };

    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.runtime.onMessage.addListener(onMessage);
    chrome.storage.onChanged.addListener(onStorageChanged);

    return () => {
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.runtime.onMessage.removeListener(onMessage);
      chrome.storage.onChanged.removeListener(onStorageChanged);
    };
  }, []);

  function connect() {
    chrome.runtime.sendMessage({ type: 'CONNECT' }, (res) => {
      refreshStatus();
      if (res?.connected) analyzeActiveTab(true); // re-analisa após conectar
    });
  }

  function disconnect() {
    connectedRef.current = false; // para de re-analisar imediatamente
    chrome.runtime.sendMessage({ type: 'DISCONNECT' }, () => refreshStatus());
  }

  function clearHistoryEntries() {
    clearHistory().then(() => setHistory([]));
  }

  return {
    connected,
    state,
    currentUrl,
    history,
    historyOpen,
    setHistoryOpen,
    analyzeActiveTab,
    connect,
    disconnect,
    clearHistoryEntries,
  };
}
