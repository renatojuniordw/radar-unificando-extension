import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getHistory, clearHistory, type AnalysisHistoryEntry } from './storage';

const styles = `
  body { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #0f172a; color: #e2e8f0; width: 300px; }
  .popup { padding: 14px; }
  h1 { margin: 0 0 4px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #ccff00; }
  .status { margin: 0 0 10px; font-size: 12px; }
  .status.ok { color: #86efac; }
  .status.off { color: #fca5a5; }
  .actions { display: flex; gap: 8px; margin-bottom: 12px; }
  .actions button {
    flex: 1; background: #1e293b; color: #cbd5e1; border: 1px solid #334155; cursor: pointer;
    padding: 8px; font-family: inherit; font-size: 11px; text-transform: uppercase; font-weight: 700;
  }
  .actions button.primary { background: #ccff00; color: #020617; border-color: #ccff00; }
  .actions button.danger { background: #450a0a; color: #fca5a5; border-color: #7f1d1d; }
  .history { border-top: 1px solid #1e293b; padding-top: 10px; }
  .history-head { display: flex; align-items: center; justify-content: space-between; }
  .history h2 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; }
  .history ul { margin: 0; padding: 0; list-style: none; max-height: 200px; overflow-y: auto; }
  .history li { display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid #1e293b; font-size: 12px; }
  .history .score { font-weight: 900; color: #ccff00; min-width: 24px; }
  .history .title { color: #cbd5e1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  button.link { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 11px; text-decoration: underline; font-family: inherit; }
  .muted { color: #64748b; font-size: 12px; }
`;

function Popup() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([]);

  function refresh(): void {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
      setConnected(Boolean(res?.connected));
    });
    getHistory().then(setHistory);
  }

  useEffect(() => {
    refresh();
  }, []);

  function connect(): void {
    chrome.runtime.sendMessage({ type: 'CONNECT' }, () => refresh());
  }

  function disconnect(): void {
    chrome.runtime.sendMessage({ type: 'DISCONNECT' }, () => refresh());
  }

  function openPanel(): void {
    chrome.runtime.sendMessage({ type: 'OPEN_PANEL' });
  }

  function clear(): void {
    clearHistory().then(() => setHistory([]));
  }

  return (
    <div className="popup">
      <style>{styles}</style>
      <h1>Radar Unificando</h1>
      <p className={`status ${connected ? 'ok' : connected === null ? '' : 'off'}`}>
        {connected === null ? 'Verificando…' : connected ? 'Conectado' : 'Desconectado'}
      </p>
      <div className="actions">
        {connected ? (
          <button className="danger" onClick={disconnect}>
            Desconectar
          </button>
        ) : (
          <button className="primary" onClick={connect}>
            Conectar conta
          </button>
        )}
        <button onClick={openPanel}>Analisar aba</button>
      </div>
      <div className="history">
        <div className="history-head">
          <h2>Histórico</h2>
          {history.length > 0 && (
            <button className="link" onClick={clear}>
              Limpar
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="muted">Nenhuma análise ainda.</p>
        ) : (
          <ul>
            {history.map((h) => (
              <li key={h.url}>
                <span className="score">{h.score}</span>
                <span className="title">{h.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<Popup />);