import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hashText } from './cache';
import type { AtsResult } from '../../shared/types';

const CACHE_TTL_MS = 30 * 60 * 1000;

describe('hashText', () => {
  it('should_return_the_same_hash_for_the_same_text', () => {
    const text = 'vaga de desenvolvedor React';
    expect(hashText(text)).toBe(hashText(text));
  });

  it('should_return_different_hashes_for_different_texts', () => {
    expect(hashText('texto A')).not.toBe(hashText('texto B'));
  });

  it('should_return_a_numeric_string', () => {
    const hash = hashText('qualquer texto');
    expect(typeof hash).toBe('string');
    expect(Number(hash)).not.toBeNaN();
  });

  it('should_return_the_djb2_seed_for_an_empty_string', () => {
    expect(hashText('')).toBe('5381');
  });

  it('should_handle_unicode_and_special_characters', () => {
    const hash = hashText('vaga de rép. São Paulo — UTF-8: ã, é, ç');
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(0);
    expect(Number(hash)).not.toBeNaN();
  });

  it('should_be_deterministic_for_unicode_input', () => {
    const text = 'vaga de rép. São Paulo — UTF-8: ã, é, ç';
    expect(hashText(text)).toBe(hashText(text));
  });
});

describe('cache functions (mock chrome.storage)', () => {
  const mockStorage: Record<string, unknown> = {};
  let nowSpy: ReturnType<typeof vi.spyOn>;

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
    nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  function makeResult(score: number): AtsResult {
    return {
      heuristics: { checks: [], score },
      analysis: {
        score,
        summary: '',
        strengths: [],
        missingKeywords: [],
        recommendations: [],
        skillScores: [],
      },
      cached: false,
      courses: [],
    };
  }

  it('should_return_null_when_there_is_no_cached_entry', async () => {
    const { getCachedAnalysis } = await import('./cache');
    const result = await getCachedAnalysis('key123');
    expect(result).toBeNull();
  });

  it('should_return_the_result_when_the_cache_entry_is_fresh', async () => {
    const { getCachedAnalysis } = await import('./cache');
    const validResult = makeResult(80);
    mockStorage['analysisCache'] = {
      key123: { result: validResult, savedAt: Date.now() - 5 * 60 * 1000 },
    };

    const result = await getCachedAnalysis('key123');
    expect(result).toEqual(validResult);
  });

  it('should_return_null_when_the_cache_entry_is_stale', async () => {
    const { getCachedAnalysis } = await import('./cache');
    mockStorage['analysisCache'] = {
      key123: { result: makeResult(80), savedAt: Date.now() - CACHE_TTL_MS - 1 },
    };

    const result = await getCachedAnalysis('key123');
    expect(result).toBeNull();
  });

  it('should_consider_an_entry_at_exactly_30_minutes_still_fresh', async () => {
    const { getCachedAnalysis } = await import('./cache');
    const validResult = makeResult(80);
    mockStorage['analysisCache'] = {
      key123: { result: validResult, savedAt: Date.now() - CACHE_TTL_MS },
    };

    const result = await getCachedAnalysis('key123');
    expect(result).toEqual(validResult);
  });

  it('should_persist_the_removal_of_a_stale_entry', async () => {
    const { getCachedAnalysis } = await import('./cache');
    mockStorage['analysisCache'] = {
      key123: { result: makeResult(80), savedAt: Date.now() - CACHE_TTL_MS - 1 },
    };

    await getCachedAnalysis('key123');

    expect(mockStorage['analysisCache']).toEqual({});
  });

  it('should_preserve_other_keys_when_removing_a_stale_entry', async () => {
    const { getCachedAnalysis } = await import('./cache');
    const freshResult = makeResult(90);
    mockStorage['analysisCache'] = {
      staleKey: { result: makeResult(10), savedAt: Date.now() - CACHE_TTL_MS - 1 },
      freshKey: { result: freshResult, savedAt: Date.now() - 1000 },
    };

    const stale = await getCachedAnalysis('staleKey');
    const fresh = await getCachedAnalysis('freshKey');

    expect(stale).toBeNull();
    expect(fresh).toEqual(freshResult);
    expect(mockStorage['analysisCache']).toEqual({
      freshKey: { result: freshResult, savedAt: Date.now() - 1000 },
    });
  });

  it('should_store_the_result_with_a_saved_at_timestamp', async () => {
    const { setCachedAnalysis, getCachedAnalysis } = await import('./cache');
    const result = makeResult(75);
    await setCachedAnalysis('key456', result);

    const entry = (mockStorage['analysisCache'] as Record<string, { result: unknown; savedAt: number }>)['key456'];
    expect(entry.result).toEqual(result);
    expect(entry.savedAt).toBe(Date.now());
    expect(await getCachedAnalysis('key456')).toEqual(result);
  });

  it('should_overwrite_an_existing_entry_for_the_same_key', async () => {
    const { setCachedAnalysis, getCachedAnalysis } = await import('./cache');
    await setCachedAnalysis('key789', makeResult(50));
    nowSpy.mockReturnValue(1_700_000_000_000 + 60_000);
    await setCachedAnalysis('key789', makeResult(60));

    const entry = (mockStorage['analysisCache'] as Record<string, { result: { analysis: { score: number } }; savedAt: number }>)['key789'];
    expect(entry.result.analysis.score).toBe(60);
    expect(entry.savedAt).toBe(1_700_000_000_000 + 60_000);
  });
});