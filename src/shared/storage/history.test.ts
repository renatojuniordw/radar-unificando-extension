import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('history storage', () => {
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

  it('getHistory retorna array vazio quando não há histórico', async () => {
    const { getHistory } = await import('./history');
    const result = await getHistory();
    expect(result).toEqual([]);
  });

  it('getHistory retorna o histórico salvo', async () => {
    const { getHistory } = await import('./history');
    const entries = [
      { url: 'https://example.com/job/1', title: 'Dev React', score: 85, date: '2024-01-01T00:00:00Z' },
      { url: 'https://example.com/job/2', title: 'Dev Vue', score: 72, date: '2024-01-02T00:00:00Z' },
    ];
    mockStorage['analysisHistory'] = entries;

    const result = await getHistory();
    expect(result).toEqual(entries);
  });

  it('addHistory adiciona entrada ao início do histórico', async () => {
    const { addHistory, getHistory } = await import('./history');
    const existing = [
      { url: 'https://example.com/job/1', title: 'Dev React', score: 85, date: '2024-01-01T00:00:00Z' },
    ];
    mockStorage['analysisHistory'] = existing;

    const newEntry = { url: 'https://example.com/job/3', title: 'Dev Node', score: 90, date: '2024-01-03T00:00:00Z' };
    await addHistory(newEntry);

    const result = await getHistory();
    expect(result[0]).toEqual(newEntry);
    expect(result).toHaveLength(2);
  });

  it('addHistory remove duplicatas por URL', async () => {
    const { addHistory, getHistory } = await import('./history');
    mockStorage['analysisHistory'] = [
      { url: 'https://example.com/job/1', title: 'Dev React', score: 85, date: '2024-01-01T00:00:00Z' },
      { url: 'https://example.com/job/2', title: 'Dev Vue', score: 72, date: '2024-01-02T00:00:00Z' },
    ];

    const updatedEntry = { url: 'https://example.com/job/1', title: 'Dev React Atualizado', score: 92, date: '2024-01-03T00:00:00Z' };
    await addHistory(updatedEntry);

    const result = await getHistory();
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Dev React Atualizado');
  });

  it('addHistory limita o histórico a 50 itens', async () => {
    const { addHistory, getHistory } = await import('./history');
    const entries = Array.from({ length: 50 }, (_, i) => ({
      url: `https://example.com/job/${i}`,
      title: `Vaga ${i}`,
      score: 50 + i,
      date: `2024-01-01T00:00:0${i}Z`,
    }));
    mockStorage['analysisHistory'] = entries;

    const newEntry = { url: 'https://example.com/job/new', title: 'Nova Vaga', score: 95, date: '2024-01-02T00:00:00Z' };
    await addHistory(newEntry);

    const result = await getHistory();
    expect(result).toHaveLength(50);
    expect(result[0].url).toBe('https://example.com/job/new');
  });

  it('clearHistory remove todo o histórico', async () => {
    const { clearHistory, getHistory } = await import('./history');
    mockStorage['analysisHistory'] = [
      { url: 'https://example.com/job/1', title: 'Dev React', score: 85, date: '2024-01-01T00:00:00Z' },
    ];

    await clearHistory();
    const result = await getHistory();
    expect(result).toEqual([]);
  });
});
