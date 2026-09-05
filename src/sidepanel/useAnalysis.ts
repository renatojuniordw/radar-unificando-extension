import { useCallback, useEffect } from 'react';
import { useConnection } from './hooks/useConnection';
import { useJobAnalysis } from './hooks/useJobAnalysis';
import { useHistory } from './hooks/useHistory';

export function useAnalysis() {
  const { history, historyOpen, setHistoryOpen, refreshHistory, clearHistoryEntries } = useHistory();

  const onConnected = useCallback(() => {
    refreshHistory();
  }, [refreshHistory]);

  const { connected, connectedRef, connectError, refreshStatus, connect, disconnect } = useConnection({ onConnected });
  const { state, currentUrl, analyzeActiveTab } = useJobAnalysis({ connectedRef });

  // Função de connect que também dispara re-análise
  const handleConnect = useCallback(() => {
    connect();
  }, [connect]);

  // Função de disconnect que também limpa estado
  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  // Sincronizar histórico quando a análise termina
  useEffect(() => {
    if (state.status === 'done') {
      refreshHistory();
    }
  }, [state.status]);

  return {
    connected,
    connectError,
    state,
    currentUrl,
    history,
    historyOpen,
    setHistoryOpen,
    analyzeActiveTab,
    connect: handleConnect,
    disconnect: handleDisconnect,
    clearHistoryEntries,
  };
}
