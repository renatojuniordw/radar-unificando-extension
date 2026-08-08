import { useEffect, useRef, useState } from 'react';
import type { AnalyzeResponse, AtsResult } from '../shared/types';
import { getHistory, clearHistory, type AnalysisHistoryEntry } from '../shared/storage';
import { errorMessage } from './utils';

export type PanelState =
  | { status: 'loading' }
  | { status: 'done'; result: AtsResult }
  | { status: 'error'; code: string; message: string };

export function useAnalysis() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [state, setState] = useState<PanelState>({ status: 'loading' });
  const [currentUrl, setCurrentUrl] = useState('');
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const lastTextRef = useRef('');

  function runAnalysis(text: string) {
    setState({ status: 'loading' });
    chrome.runtime.sendMessage({ type: 'ANALYZE', jobDescription: text }, (res: AnalyzeResponse) => {
      if (!res) {
        setState({ status: 'error', code: 'UNKNOWN', message: 'Sem resposta da extensão.' });
        return;
      }
      if ('error' in res) {
        setState({ status: 'error', code: res.error, message: errorMessage(res.error) });
        return;
      }
      setState({ status: 'done', result: res });
    });
  }

  async function analyzeActiveTab(force = false) {
    const res = await chrome.runtime.sendMessage({ type: 'GET_PAGE_TEXT' });
    const text = res?.text;
    if (!text) {
      setState({ status: 'error', code: 'NO_TEXT', message: 'Não encontramos texto de vaga nesta página.' });
      return;
    }
    setCurrentUrl(res.url ?? '');
    if (!force && text === lastTextRef.current) return;
    lastTextRef.current = text;
    runAnalysis(text);
  }

  function refreshStatus() {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => setConnected(Boolean(res?.connected)));
    getHistory().then(setHistory);
  }

  useEffect(() => {
    refreshStatus();
    analyzeActiveTab(true);

    const onActivated = () => analyzeActiveTab(false);
    const onUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.url) analyzeActiveTab(false);
    };
    const onMessage = (msg: { type?: string }) => {
      if (msg?.type === 'PAGE_CHANGED') analyzeActiveTab(false);
    };

    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.runtime.onMessage.addListener(onMessage);

    return () => {
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  function connect() {
    chrome.runtime.sendMessage({ type: 'CONNECT' }, () => refreshStatus());
  }

  function disconnect() {
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
