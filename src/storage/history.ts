const HISTORY_KEY = 'analysisHistory';
const MAX_HISTORY_ITEMS = 50;

export interface AnalysisHistoryEntry {
  url: string;
  title: string;
  score: number;
  date: string; // ISO timestamp
}

export async function getHistory(): Promise<AnalysisHistoryEntry[]> {
  const data = await chrome.storage.local.get(HISTORY_KEY);
  return data[HISTORY_KEY] ?? [];
}

/** Adiciona (ou move para o topo) uma entrada de histórico e limita o tamanho. */
export async function addHistory(entry: AnalysisHistoryEntry): Promise<void> {
  const history = await getHistory();
  const next = [
    entry,
    ...history.filter((h) => h.url !== entry.url),
  ].slice(0, MAX_HISTORY_ITEMS);
  await chrome.storage.local.set({ [HISTORY_KEY]: next });
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove(HISTORY_KEY);
}