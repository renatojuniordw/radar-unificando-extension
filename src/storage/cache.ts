import type { AtsResult } from '../types';

const CACHE_KEY = 'analysisCache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

interface CacheEntry {
  url: string;
  result: AtsResult;
  savedAt: number;
}

async function readCache(): Promise<Record<string, CacheEntry>> {
  const data = await chrome.storage.local.get(CACHE_KEY);
  return data[CACHE_KEY] ?? {};
}

async function writeCache(cache: Record<string, CacheEntry>): Promise<void> {
  await chrome.storage.local.set({ [CACHE_KEY]: cache });
}

/** Retorna a análise em cache para a URL, se ainda válida. */
export async function getCachedAnalysis(url: string): Promise<AtsResult | null> {
  const cache = await readCache();
  const entry = cache[url];
  if (!entry) return null;
  if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
    const { [url]: _stale, ...rest } = cache;
    await writeCache(rest);
    return null;
  }
  return entry.result;
}

export async function setCachedAnalysis(url: string, result: AtsResult): Promise<void> {
  const cache = await readCache();
  cache[url] = { url, result, savedAt: Date.now() };
  await writeCache(cache);
}

export async function clearCache(): Promise<void> {
  await chrome.storage.local.remove(CACHE_KEY);
}