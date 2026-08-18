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

  it('should_return_empty_array_when_no_history_is_stored', async () => {
    const { getHistory } = await import('./history');
    const result = await getHistory();
    expect(result).toEqual([]);
  });

  it('should_return_the_stored_history_entries', async () => {
    const { getHistory } = await import('./history');
    const entries = [
      { url: 'https://example.com/job/1', title: 'Dev React', score: 85, date: '2024-01-01T00:00:00Z' },
      { url: 'https://example.com/job/2', title: 'Dev Vue', score: 72, date: '2024-01-02T00:00:00Z' },
    ];
    mockStorage['analysisHistory'] = entries;

    const result = await getHistory();
    expect(result).toEqual(entries);
  });

  it('should_prepend_a_new_entry_to_the_history', async () => {
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

  it('should_move_an_existing_entry_with_the_same_url_to_the_top', async () => {
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
    expect(result[1].url).toBe('https://example.com/job/2');
  });

  it('should_keep_the_remaining_entries_in_their_original_order_after_dedup', async () => {
    const { addHistory, getHistory } = await import('./history');
    mockStorage['analysisHistory'] = [
      { url: 'https://example.com/job/1', title: 'A', score: 10, date: '2024-01-01T00:00:00Z' },
      { url: 'https://example.com/job/2', title: 'B', score: 20, date: '2024-01-02T00:00:00Z' },
      { url: 'https://example.com/job/3', title: 'C', score: 30, date: '2024-01-03T00:00:00Z' },
    ];

    await addHistory({ url: 'https://example.com/job/2', title: 'B2', score: 99, date: '2024-01-04T00:00:00Z' });

    const result = await getHistory();
    expect(result.map((h) => h.url)).toEqual([
      'https://example.com/job/2',
      'https://example.com/job/1',
      'https://example.com/job/3',
    ]);
  });

  it('should_cap_the_history_at_50_items_dropping_the_oldest', async () => {
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
    expect(result[49].url).toBe('https://example.com/job/48');
  });

  it('should_clear_the_entire_history', async () => {
    const { clearHistory, getHistory } = await import('./history');
    mockStorage['analysisHistory'] = [
      { url: 'https://example.com/job/1', title: 'Dev React', score: 85, date: '2024-01-01T00:00:00Z' },
    ];

    await clearHistory();
    const result = await getHistory();
    expect(result).toEqual([]);
  });
});