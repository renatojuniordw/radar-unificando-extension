import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { useHistory } from './useHistory';

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
  cleanup();
  vi.restoreAllMocks();
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
});

const ENTRY = {
  url: 'https://example.com/job/1',
  title: 'Dev React',
  score: 85,
  date: '2024-01-01T00:00:00Z',
};

describe('useHistory', () => {
  it('should_start_with_empty_history_and_closed_panel', () => {
    const { result } = renderHook(() => useHistory());
    expect(result.current.history).toEqual([]);
    expect(result.current.historyOpen).toBe(false);
  });

  it('should_load_history_from_storage_on_mount', async () => {
    mockStorage['analysisHistory'] = [ENTRY];
    const { result } = renderHook(() => useHistory());

    await waitFor(() => {
      expect(result.current.history).toEqual([ENTRY]);
    });
  });

  it('should_refresh_history_from_storage', async () => {
    const { result } = renderHook(() => useHistory());

    mockStorage['analysisHistory'] = [ENTRY];
    await act(async () => {
      await result.current.refreshHistory();
    });

    expect(result.current.history).toEqual([ENTRY]);
  });

  it('should_clear_history_entries', async () => {
    mockStorage['analysisHistory'] = [ENTRY];
    const { result } = renderHook(() => useHistory());

    await act(async () => {
      await result.current.clearHistoryEntries();
    });

    expect(result.current.history).toEqual([]);
    expect(mockStorage['analysisHistory']).toBeUndefined();
  });

  it('should_toggle_history_open_state', () => {
    const { result } = renderHook(() => useHistory());

    act(() => {
      result.current.setHistoryOpen(true);
    });
    expect(result.current.historyOpen).toBe(true);

    act(() => {
      result.current.setHistoryOpen(false);
    });
    expect(result.current.historyOpen).toBe(false);
  });
});