import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { useAnalysis } from './useAnalysis';

const mockStorage: Record<string, unknown> = {};
let sendMessageMock: ReturnType<typeof vi.fn>;
let storageChangeListener: ((changes: Record<string, { newValue?: unknown }>, areaName: string) => void) | null = null;

const ATS_RESULT = {
  heuristics: { checks: [], score: 80 },
  analysis: { score: 80, summary: 'ok', strengths: [], missingKeywords: [], recommendations: [], skillScores: [] },
  cached: false,
  courses: [],
};

beforeEach(() => {
  // Stateful mock: GET_STATUS reflects the current connection state
  let connected = true;
  sendMessageMock = vi.fn((msg: { type: string }, cb?: (res: unknown) => void) => {
    const responses: Record<string, unknown> = {
      GET_STATUS: { connected },
      GET_PAGE_TEXT: { text: 'job text', url: 'https://example.com/job/1' },
      ANALYZE: ATS_RESULT,
      CONNECT: { connected: true },
      DISCONNECT: { ok: true },
    };
    if (msg.type === 'DISCONNECT') connected = false;
    if (msg.type === 'CONNECT') connected = true;
    const res = responses[msg.type];
    if (cb) {
      cb(res);
      return undefined;
    }
    return Promise.resolve(res);
  });

  vi.stubGlobal('chrome', {
    runtime: {
      sendMessage: sendMessageMock,
      lastError: null,
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
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
      onChanged: {
        addListener: vi.fn((cb: typeof storageChangeListener) => {
          storageChangeListener = cb;
        }),
        removeListener: vi.fn(() => {
          storageChangeListener = null;
        }),
      },
    },
    tabs: {
      onActivated: { addListener: vi.fn(), removeListener: vi.fn() },
      onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  storageChangeListener = null;
});

// Helper: resolves the connection status via a storage change
// (the only path that triggers refreshStatus on load in the current code).
function resolveConnectionViaStorageChange() {
  storageChangeListener?.({ extensionToken: { newValue: 'token' } }, 'local');
}

describe('useAnalysis', () => {
  it('should_expose_connected_state_when_connection_is_resolved', async () => {
    const { result } = renderHook(() => useAnalysis());
    resolveConnectionViaStorageChange();

    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });
  });

  it('should_query_connection_status_on_mount', async () => {
    // REGRA CORRETA: ao montar, o status de conexão deve ser resolvido via GET_STATUS.
    // DEFEITO: refreshStatus nunca é chamado no mount.
    const { result } = renderHook(() => useAnalysis());
    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith({ type: 'GET_STATUS' }, expect.any(Function));
    });
  });

  it('should_expose_analysis_state_and_current_url', async () => {
    const { result } = renderHook(() => useAnalysis());
    await waitFor(() => {
      expect(result.current.state.status).toBe('done');
    });
    expect(result.current.currentUrl).toBe('https://example.com/job/1');
  });

  it('should_refresh_history_when_analysis_completes', async () => {
    mockStorage['analysisHistory'] = [
      { url: 'https://example.com/job/1', title: 'Dev React', score: 85, date: '2024-01-01T00:00:00Z' },
    ];
    const { result } = renderHook(() => useAnalysis());

    await waitFor(() => {
      expect(result.current.state.status).toBe('done');
    });
    await waitFor(() => {
      expect(result.current.history).toHaveLength(1);
    });
  });

  it('should_connect_and_update_connected_state', async () => {
    const { result } = renderHook(() => useAnalysis());

    act(() => {
      result.current.connect();
    });

    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });
    expect(sendMessageMock).toHaveBeenCalledWith({ type: 'CONNECT' }, expect.any(Function));
  });

  it('should_disconnect_and_update_connected_state', async () => {
    const { result } = renderHook(() => useAnalysis());
    resolveConnectionViaStorageChange();
    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });

    act(() => {
      result.current.disconnect();
    });

    await waitFor(() => {
      expect(result.current.connected).toBe(false);
    });
    expect(sendMessageMock).toHaveBeenCalledWith({ type: 'DISCONNECT' }, expect.any(Function));
  });

  it('should_clear_history_entries', async () => {
    mockStorage['analysisHistory'] = [
      { url: 'https://example.com/job/1', title: 'Dev React', score: 85, date: '2024-01-01T00:00:00Z' },
    ];
    const { result } = renderHook(() => useAnalysis());

    await waitFor(() => {
      expect(result.current.history).toHaveLength(1);
    });

    act(() => {
      result.current.clearHistoryEntries();
    });

    await waitFor(() => {
      expect(result.current.history).toHaveLength(0);
    });
  });

  it('should_toggle_history_open_state', () => {
    const { result } = renderHook(() => useAnalysis());

    act(() => {
      result.current.setHistoryOpen(true);
    });
    expect(result.current.historyOpen).toBe(true);
  });
});