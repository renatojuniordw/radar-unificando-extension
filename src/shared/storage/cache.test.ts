import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hashText } from './cache';

describe('hashText', () => {
  it('retorna hash consistente para o mesmo texto', () => {
    const text = 'vaga de desenvolvedor React';
    expect(hashText(text)).toBe(hashText(text));
  });

  it('retorna hashes diferentes para textos diferentes', () => {
    expect(hashText('texto A')).not.toBe(hashText('texto B'));
  });

  it('retorna string numérica', () => {
    const hash = hashText('qualquer texto');
    expect(typeof hash).toBe('string');
    expect(Number(hash)).not.toBeNaN();
  });

  it('lida com string vazia', () => {
    expect(hashText('')).toBeDefined();
  });

  it('lida com caracteres especiais e unicode', () => {
    const hash = hashText('vaga de rép. São Paulo — UTF-8: ã, é, ç');
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(0);
  });
});

describe('cache functions (mock chrome.storage)', () => {
  const mockStorage: Record<string, unknown> = {};

  beforeEach(() => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
          set: vi.fn(async (data: Record<string, unknown>) => {
            Object.assign(mockStorage, data);
          }),
          remove: vi.fn(async (key: string) => {
            delete mockStorage[key];
          }),
        },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  it('getCachedAnalysis retorna null quando não há cache', async () => {
    const { getCachedAnalysis } = await import('./cache');
    const result = await getCachedAnalysis('key123');
    expect(result).toBeNull();
  });

  it('getCachedAnalysis retorna null quando o cache expirou', async () => {
    const { getCachedAnalysis } = await import('./cache');
    const expiredEntry = {
      result: { heuristics: { checks: [], score: 80 }, analysis: { score: 80 }, cached: false, courses: [] },
      savedAt: Date.now() - 31 * 60 * 1000, // 31 minutos atrás
    };
    mockStorage['analysisCache'] = { 'key123': expiredEntry };

    const result = await getCachedAnalysis('key123');
    expect(result).toBeNull();
  });

  it('getCachedAnalysis retorna resultado quando cache é válido', async () => {
    const { getCachedAnalysis } = await import('./cache');
    const validResult = { heuristics: { checks: [], score: 80 }, analysis: { score: 80 }, cached: false, courses: [] };
    const validEntry = {
      result: validResult,
      savedAt: Date.now() - 5 * 60 * 1000, // 5 minutos atrás
    };
    mockStorage['analysisCache'] = { 'key123': validEntry };

    const result = await getCachedAnalysis('key123');
    expect(result).toEqual(validResult);
  });
});
