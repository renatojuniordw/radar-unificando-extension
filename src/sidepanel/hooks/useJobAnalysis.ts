import { useState, useRef, useEffect } from 'react';
import type { AnalyzeErrorCode, AnalyzeResponse, AtsResult } from '../../shared/types';
import { errorMessage } from '../utils';

export type PanelState =
  | { status: 'loading' }
  | { status: 'done'; result: AtsResult }
  | { status: 'error'; code: AnalyzeErrorCode; message: string };

interface UseJobAnalysisOptions {
  connectedRef: React.MutableRefObject<boolean | null>;
}

export function useJobAnalysis({ connectedRef }: UseJobAnalysisOptions) {
  const [state, setState] = useState<PanelState>({ status: 'loading' });
  const [currentUrl, setCurrentUrl] = useState('');
  const lastTextRef = useRef('');
  const requestIdRef = useRef(0);

  function runAnalysis(text: string, requestId: number) {
    console.log('[radar-ext] sidepanel: iniciando análise', { textLength: text.length, requestId });
    setState({ status: 'loading' });
    chrome.runtime.sendMessage({ type: 'ANALYZE', jobDescription: text }, (res: AnalyzeResponse) => {
      if (requestId !== requestIdRef.current) {
        console.log('[radar-ext] sidepanel: resposta obsoleta descartada', { requestId });
        return;
      }
      if (!res) {
        console.error('[radar-ext] sidepanel: sem resposta do background', chrome.runtime.lastError);
        setState({ status: 'error', code: 'UNKNOWN', message: 'Sem resposta da extensão.' });
        return;
      }
      if ('error' in res) {
        console.error('[radar-ext] sidepanel: erro na análise', res);
        const code = res.error as AnalyzeErrorCode;
        setState({ status: 'error', code, message: errorMessage(code, res.message) });
        return;
      }
      console.log('[radar-ext] sidepanel: análise concluída', { score: res.analysis?.score });
      setState({ status: 'done', result: res });
    });
  }

  async function analyzeActiveTab(force = false) {
    const requestId = ++requestIdRef.current;
    const res = await chrome.runtime.sendMessage({ type: 'GET_PAGE_TEXT' });
    if (requestId !== requestIdRef.current) return;
    const text = res?.text;
    console.log('[radar-ext] sidepanel: GET_PAGE_TEXT', { url: res?.url, textLength: text?.length ?? 0, force });
    if (!text) {
      setState({ status: 'error', code: 'NO_TEXT', message: 'Não encontramos texto de vaga nesta página.' });
      return;
    }
    setCurrentUrl(res.url ?? '');
    if (!force && text === lastTextRef.current) return;
    lastTextRef.current = text;
    runAnalysis(text, requestId);
  }

  const isActive = () => connectedRef.current !== false;

  // Listener para mudanças de aba e conteúdo
  useEffect(() => {
    analyzeActiveTab(true);

    const onActivated = () => {
      if (isActive()) analyzeActiveTab(false);
    };
    const onUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.url && isActive()) analyzeActiveTab(false);
    };
    const onMessage = (msg: { type?: string }) => {
      if (msg?.type === 'PAGE_CHANGED' && isActive()) analyzeActiveTab(false);
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

  return {
    state,
    currentUrl,
    analyzeActiveTab,
  };
}
