import { useAnalysis } from './useAnalysis';
import { truncateUrl } from './utils';
import { styles } from './styles';
import ErrorView from './components/ErrorView';
import ResultView from './components/ResultView';

function SidePanel() {
  const {
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
  } = useAnalysis();

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
              <button className="link" onClick={clearHistoryEntries}>
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

export default SidePanel;
