import { useState, useEffect } from 'react';
import { getHistory, clearHistory, type AnalysisHistoryEntry } from '../../shared/storage';

export function useHistory() {
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  function refreshHistory() {
    getHistory().then(setHistory);
  }

  function clearHistoryEntries() {
    clearHistory().then(() => setHistory([]));
  }

  useEffect(() => {
    refreshHistory();
  }, []);

  return {
    history,
    historyOpen,
    setHistoryOpen,
    refreshHistory,
    clearHistoryEntries,
  };
}
