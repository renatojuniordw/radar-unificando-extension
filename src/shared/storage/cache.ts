import type { AtsResult } from '../types';

const CACHE_KEY = 'analysisCache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

interface CacheEntry {
  result: AtsResult;
  savedAt: number;
}

/**
 * Hash simples (djb2) do texto da vaga. Usado como chave do cache: a URL não é
 * estável em SPAs (a vaga muda sem o endereço mudar), mas o texto identifica
 * o conteúdo analisado.
 */
export function hashText(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  }
  return String(h);
}

async function readCache(): Promise<Record<string, CacheEntry>> {
  const data = await chrome.storage.local.get(CACHE_KEY);
  return data[CACHE_KEY] ?? {};
}

async function writeCache(cache: Record<string, CacheEntry>): Promise<void> {
  await chrome.storage.local.set({ [CACHE_KEY]: cache });
}

/** Retorna a análise em cache para o texto, se ainda válida. */
export async function getCachedAnalysis(key: string): Promise<AtsResult | null> {
  const cache = await readCache();
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
    const { [key]: _stale, ...rest } = cache;
    await writeCache(rest);
    return null;
  }
  return entry.result;
}

export async function setCachedAnalysis(key: string, result: AtsResult): Promise<void> {
  const cache = await readCache();
  cache[key] = { result, savedAt: Date.now() };
  await writeCache(cache);
}

export async function clearCache(): Promise<void> {
  await chrome.storage.local.remove(CACHE_KEY);
}