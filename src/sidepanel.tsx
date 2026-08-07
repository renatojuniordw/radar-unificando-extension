import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { AnalyzeResponse, AtsResult } from './types';
import { formatResultToText } from './format';
import { copyText } from './clipboard';
import { getHistory, clearHistory, type AnalysisHistoryEntry } from './storage';

type PanelState =
  | { status: 'loading' }
  | { status: 'done'; result: AtsResult }
  | { status: 'error'; code: string; message: string };

function truncateUrl(url: string, max = 60): string {
  return url.length > max ? `${url.slice(0, max)}…` : url;
}

function SidePanel() {
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

  return (
    <div className="sidepanel">
      <style>{styles}</style>
      <header className="header">
        <div className="brand">
          <span className="logo">R</span>
          <span className="title">Radar Unificando</span>
        </div>
        <div className="header-actions">
          <span
            className={`status-dot ${connected ? 'ok' : connected === null ? '' : 'off'}`}
            title={connected === null ? 'Verificando…' : connected ? 'Conectado' : 'Desconectado'}
          />
          <button className="reanalyze" onClick={() => analyzeActiveTab(true)}>
            Reanalisar
          </button>
        </div>
      </header>

      {currentUrl && (
        <div className="page-url" title={currentUrl}>
          {truncateUrl(currentUrl)}
        </div>
      )}

      <div className="body">
        {state.status === 'loading' && (
          <div className="loading">
            <span className="spinner" />
            <p className="muted">Analisando vaga…</p>
          </div>
        )}
        {state.status === 'error' && (
          <ErrorView code={state.code} message={state.message} onRetry={() => analyzeActiveTab(true)} />
        )}
        {state.status === 'done' && <ResultView result={state.result} />}
      </div>

      <footer className="footer">
        <div className="history-head">
          <button
            className="history-toggle"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-expanded={historyOpen}
          >
            <span className={`chevron ${historyOpen ? 'open' : ''}`}>▸</span>
            <h2>Histórico</h2>
            {history.length > 0 && <span className="history-count">{history.length}</span>}
          </button>
          <div className="footer-actions">
            {connected ? (
              <button className="link" onClick={disconnect}>
                Desconectar
              </button>
            ) : (
              <button className="link" onClick={connect}>
                Conectar
              </button>
            )}
            {history.length > 0 && (
              <button className="link" onClick={() => clearHistory().then(() => setHistory([]))}>
                Limpar
              </button>
            )}
          </div>
        </div>
        {historyOpen &&
          (history.length === 0 ? (
            <p className="muted">Nenhuma análise ainda.</p>
          ) : (
            <div className="history-container">
              <ul className="history">
                {history.map((h) => (
                  <li key={h.url}>
                    <span className="score">{h.score}</span>
                    <span className="title">{h.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </footer>
    </div>
  );
}

function errorMessage(code: string): string {
  switch (code) {
    case 'NOT_CONNECTED':
      return 'Sua conta não está conectada. Clique em "Conectar" no rodapé para continuar.';
    case 'NO_RESUME':
      return 'Nenhum currículo encontrado. Importe seu currículo no site primeiro.';
    case 'RATE_LIMITED':
      return 'Muitas análises em pouco tempo. Aguarde um instante e tente de novo.';
    case 'NO_TEXT':
      return 'Não encontramos texto de vaga nesta página.';
    default:
      return 'Não foi possível analisar a vaga. Tente novamente.';
  }
}

function ErrorView({ code, message, onRetry }: { code: string; message: string; onRetry: () => void }) {
  const isNotConnected = code === 'NOT_CONNECTED';
  return (
    <div className="error-view">
      <p className="error">{message}</p>
      {isNotConnected && (
        <button className="primary" onClick={onRetry}>
          Conectar conta
        </button>
      )}
    </div>
  );
}

function ResultView({ result }: { result: AtsResult }) {
  const { analysis, heuristics } = result;
  const [copied, setCopied] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<boolean | null>(null);

  async function copyTips() {
    const ok = await copyText(formatResultToText(result));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function sendFeedback(rating: boolean) {
    if (feedbackSent !== null) return;
    setFeedbackSent(rating);
    chrome.runtime.sendMessage({ type: 'FEEDBACK', rating });
  }

  return (
    <div>
      {result.cached && <div className="cached">Resultado em cache</div>}

      <div className="score-card">
        <div className="score-main">
          <span className="score-value">{analysis.score}</span>
          <span className="score-label">/ 100</span>
        </div>
        <div className="score-track">
          <div className="score-fill" style={{ width: `${Math.max(0, Math.min(100, analysis.score))}%` }} />
        </div>
      </div>

      {analysis.summary && <p className="summary">{analysis.summary}</p>}

      {analysis.skillScores?.length > 0 && (
        <Section title="Score por skill">
          {analysis.skillScores.map((s) => (
            <div key={s.skill} className="skill">
              <div className="skill-row">
                <span className="skill-name">{s.skill}</span>
                <span className={s.present ? 'ok' : 'bad'}>{s.score}/100</span>
              </div>
              <div className="score-track slim">
                <div className="score-fill" style={{ width: `${Math.max(0, Math.min(100, s.score))}%` }} />
              </div>
              {s.suggestion && <p className="skill-suggestion">{s.suggestion}</p>}
            </div>
          ))}
        </Section>
      )}

      {analysis.strengths.length > 0 && (
        <Section title="Pontos fortes">
          <ul className="list">{analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </Section>
      )}

      {analysis.missingKeywords.length > 0 && (
        <Section title="Skills faltando">
          <div className="chips">
            {analysis.missingKeywords.map((s, i) => (
              <span key={i} className="chip warn">
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {analysis.recommendations.length > 0 && (
        <Section title="Dicas">
          <ul className="list">{analysis.recommendations.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </Section>
      )}

      {heuristics.checks.length > 0 && (
        <Section title="Checklist do currículo">
          <ul className="list">
            {heuristics.checks.map((c) => (
              <li key={c.id} className={c.ok ? 'ok' : 'bad'}>
                <span className="check">{c.ok ? '✓' : '✗'}</span> {c.label}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="actions">
        <button className="ghost" onClick={copyTips}>
          {copied ? 'Copiado!' : 'Copiar dicas'}
        </button>
        <div className="feedback">
          <span className="muted">Útil?</span>
          <button
            className={feedbackSent === true ? 'active' : ''}
            onClick={() => sendFeedback(true)}
            disabled={feedbackSent !== null}
          >
            Sim
          </button>
          <button
            className={feedbackSent === false ? 'active' : ''}
            onClick={() => sendFeedback(false)}
            disabled={feedbackSent !== null}
          >
            Não
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="section">
      <h4>{title}</h4>
      {children}
    </div>
  );
}

const styles = `
  :root {
    color-scheme: light;
    --accent: #00ff66;
    --accent-soft: #e6fff0;
    --accent-dark: #059669;
    --bg: #f6f7f9;
    --card: #ffffff;
    --border: #e5e7eb;
    --text: #1f2937;
    --muted: #6b7280;
    --ok: #16a34a;
    --bad: #dc2626;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; background: var(--bg); }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 13px; line-height: 1.55; color: var(--text);
  }
  .sidepanel { display: flex; flex-direction: column; height: 100vh; }
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px; background: var(--card); border-bottom: 1px solid var(--border);
    position: sticky; top: 0; z-index: 1;
  }
  .brand { display: flex; align-items: center; gap: 8px; }
  .logo {
    display: inline-flex; align-items: center; justify-content: center;
    width: 24px; height: 24px; border-radius: 7px;
    background: var(--accent); color: #020617; font-weight: 900; font-size: 13px;
  }
  .title { font-weight: 700; font-size: 13px; color: var(--text); }
  .header-actions { display: flex; align-items: center; gap: 8px; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #d1d5db; }
  .status-dot.ok { background: var(--ok); }
  .status-dot.off { background: var(--bad); }
  .reanalyze {
    background: var(--card); color: var(--muted); border: 1px solid var(--border); cursor: pointer;
    padding: 5px 12px; border-radius: 8px; font-family: inherit; font-size: 11px; font-weight: 600;
  }
  .reanalyze:hover { color: var(--accent-dark); border-color: var(--accent-dark); }
  .page-url {
    padding: 6px 14px; font-size: 11px; color: var(--muted); background: var(--card);
    border-bottom: 1px solid var(--border);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .body { flex: 1; overflow-y: auto; padding: 14px; }
  .footer { border-top: 1px solid var(--border); background: var(--card); padding: 12px 14px; max-height: 38%; overflow-y: auto; }
  .muted { color: var(--muted); }
  .error { color: var(--bad); }
  .summary { color: var(--text); margin: 0 0 12px; }
  .cached {
    display: inline-block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--muted); background: var(--card); border: 1px solid var(--border);
    border-radius: 6px; padding: 2px 8px; margin-bottom: 10px;
  }
  .loading { display: flex; align-items: center; gap: 10px; padding: 10px 0; }
  .spinner {
    width: 16px; height: 16px; border: 2px solid var(--border); border-top-color: var(--accent-dark);
    border-radius: 50%; animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .score-card {
    background: var(--card); border: 1px solid var(--border); border-radius: 12px;
    padding: 14px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  }
  .score-main { display: flex; align-items: baseline; gap: 4px; }
  .score-value { font-size: 40px; font-weight: 800; color: var(--accent-dark); line-height: 1; }
  .score-label { color: var(--muted); font-size: 13px; }
  .score-track { height: 8px; background: #eef0f3; border-radius: 6px; overflow: hidden; margin-top: 8px; }
  .score-track.slim { height: 6px; margin-top: 4px; }
  .score-fill { height: 100%; background: linear-gradient(90deg, #34d399, var(--accent)); border-radius: 6px; }
  .section { margin-top: 16px; }
  .section h4 {
    margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--muted); font-weight: 600;
  }
  .list { margin: 0; padding-left: 0; list-style: none; }
  .list li { margin-bottom: 6px; padding-left: 14px; position: relative; }
  .list li::before { content: '·'; position: absolute; left: 2px; color: var(--accent-dark); }
  .list li.ok { color: var(--ok); }
  .list li.bad { color: var(--bad); }
  .list .check { color: var(--ok); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { padding: 3px 10px; border-radius: 999px; font-size: 12px; background: #eef0f3; color: var(--text); }
  .chip.warn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .skill { margin-bottom: 10px; }
  .skill-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px; }
  .skill-name { color: var(--text); }
  .skill-suggestion { margin: 3px 0 0; color: var(--muted); font-size: 11px; }
  .ok { color: var(--ok); }
  .bad { color: var(--bad); }
  .actions { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; gap: 8px; }
  .feedback { display: flex; align-items: center; gap: 6px; }
  .feedback button {
    background: var(--card); color: var(--muted); border: 1px solid var(--border); cursor: pointer;
    padding: 5px 10px; font-family: inherit; font-size: 11px; border-radius: 8px;
  }
  .feedback button.active { background: var(--accent-soft); color: var(--accent-dark); border-color: var(--accent); font-weight: 700; }
  .feedback button:disabled { opacity: 0.5; cursor: default; }
  button.ghost {
    background: var(--card); color: var(--accent-dark); border: 1px solid var(--accent); cursor: pointer;
    padding: 6px 12px; font-family: inherit; font-size: 11px; font-weight: 600; border-radius: 8px;
  }
  button.ghost:hover { background: var(--accent-soft); }
  button.primary {
    margin-top: 8px; background: var(--accent); color: #020617; border: none; font-weight: 700;
    padding: 9px 14px; cursor: pointer; font-family: inherit; font-size: 12px; border-radius: 8px;
  }
  button.primary:hover { background: #33ff7a; }
  button.primary:disabled { opacity: 0.5; cursor: default; }
  .error-view { padding: 6px 0; }
  .history-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .history-toggle {
    display: flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer;
    padding: 0; font-family: inherit;
  }
  .history-toggle h2 { margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
  .history-toggle:hover h2 { color: var(--accent-dark); }
  .chevron { display: inline-block; font-size: 10px; color: var(--muted); transition: transform 0.15s ease; }
  .chevron.open { transform: rotate(90deg); }
  .history-count {
    background: #eef0f3; color: var(--muted); border-radius: 999px; font-size: 10px;
    padding: 1px 7px; font-weight: 600;
  }
  .footer-actions { display: flex; gap: 10px; }
  .history-container { height: 200px; overflow-y: auto; margin-top: 4px; }
  .history { margin: 0; padding: 0; list-style: none; }
  .history li { display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid var(--border); font-size: 12px; }
  .history .score { font-weight: 800; color: var(--accent-dark); min-width: 24px; }
  .history .title { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  button.link { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 11px; text-decoration: underline; font-family: inherit; padding: 0; }
  button.link:hover { color: var(--accent-dark); }
`;

const root = document.getElementById('root');
if (root) createRoot(root).render(<SidePanel />);