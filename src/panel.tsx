import { useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { AnalyzeResponse, AtsResult } from './types';

const PANEL_HOST_ID = 'radar-unificando-panel-host';

let currentRoot: Root | null = null;

/** Renderiza (ou substitui) o painel flutuante na página, isolado em Shadow DOM. */
export function renderPanel(jobDescription: string): void {
  const existing = document.getElementById(PANEL_HOST_ID);
  if (existing) existing.remove();

  const host = document.createElement('div');
  host.id = PANEL_HOST_ID;
  const shadow = host.attachShadow({ mode: 'open' });
  document.documentElement.appendChild(host);

  currentRoot = createRoot(shadow);
  currentRoot.render(<Panel jobDescription={jobDescription} />);
}

function closePanel(): void {
  currentRoot?.unmount();
  currentRoot = null;
  document.getElementById(PANEL_HOST_ID)?.remove();
}

function Panel({ jobDescription }: { jobDescription: string }) {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'done'; result: AtsResult }
    | { status: 'error'; code: string; message: string }
  >({ status: 'loading' });

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

  useEffect(() => {
    if (!jobDescription.trim()) {
      setState({ status: 'error', code: 'NO_TEXT', message: 'Não encontramos texto nesta página.' });
      return;
    }
    runAnalysis(jobDescription);
  }, [jobDescription]);

  return (
    <div className="panel">
      <style>{styles}</style>
      <div className="header">
        <span className="title">Radar Unificando</span>
        <button className="close" onClick={closePanel} aria-label="Fechar">
          ×
        </button>
      </div>
      <div className="body">
        {state.status === 'loading' && <p className="muted">Analisando vaga…</p>}
        {state.status === 'error' && (
          <ErrorView code={state.code} message={state.message} onRetry={() => runAnalysis(jobDescription)} />
        )}
        {state.status === 'done' && <ResultView result={state.result} />}
      </div>
    </div>
  );
}

function errorMessage(code: string): string {
  switch (code) {
    case 'NOT_CONNECTED':
      return 'Sua conta não está conectada. Clique no ícone novamente para conectar.';
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
    <div>
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
  return (
    <div>
      <ScoreBar score={analysis.score} />
      {analysis.summary && <p className="summary">{analysis.summary}</p>}

      {analysis.strengths.length > 0 && (
        <Section title="Pontos fortes">
          <ul>{analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </Section>
      )}

      {analysis.missingKeywords.length > 0 && (
        <Section title="Skills faltando">
          <ul className="warn">{analysis.missingKeywords.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </Section>
      )}

      {analysis.recommendations.length > 0 && (
        <Section title="Dicas">
          <ul>{analysis.recommendations.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </Section>
      )}

      {heuristics.checks.length > 0 && (
        <Section title="Checklist do currículo">
          <ul>
            {heuristics.checks.map((c) => (
              <li key={c.id} className={c.ok ? 'ok' : 'bad'}>
                {c.ok ? '✓' : '✗'} {c.label}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="score">
      <span className="score-value">{score}</span>
      <span className="score-label">/ 100</span>
      <div className="score-track">
        <div className="score-fill" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
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
  :host { all: initial; }
  * { box-sizing: border-box; }
  .panel {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 2147483647;
    width: 360px;
    max-height: 80vh;
    overflow-y: auto;
    background: #0f172a;
    color: #e2e8f0;
    border: 2px solid #ccff00;
    border-radius: 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
    line-height: 1.5;
    box-shadow: 6px 6px 0 rgba(0,0,0,0.35);
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid #1e293b;
  }
  .title { font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #ccff00; font-size: 12px; }
  .close {
    background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; line-height: 1;
  }
  .close:hover { color: #fff; }
  .body { padding: 12px; }
  .muted { color: #94a3b8; }
  .error { color: #fca5a5; }
  .summary { color: #cbd5e1; }
  .section { margin-top: 12px; }
  .section h4 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #ccff00; }
  .section ul { margin: 0; padding-left: 16px; }
  .section li { margin-bottom: 4px; }
  li.ok { color: #86efac; }
  li.bad { color: #fca5a5; }
  ul.warn li { color: #fde68a; }
  .score { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
  .score-value { font-size: 28px; font-weight: 900; color: #ccff00; }
  .score-label { color: #94a3b8; font-size: 12px; }
  .score-track { flex: 1; height: 8px; background: #1e293b; border-radius: 4px; overflow: hidden; }
  .score-fill { height: 100%; background: #ccff00; }
  button.primary {
    margin-top: 8px; background: #ccff00; color: #020617; border: none; font-weight: 900;
    padding: 8px 12px; cursor: pointer; font-family: inherit; text-transform: uppercase; font-size: 11px;
  }
`;