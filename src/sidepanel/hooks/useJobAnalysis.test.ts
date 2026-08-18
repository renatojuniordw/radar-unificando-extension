import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { useJobAnalysis } from './useJobAnalysis';

type SendMessageFn = (msg: { type: string }, cb?: (res: unknown) => void) => unknown;

let sendMessageMock: SendMessageFn = vi.fn();
let onActivatedListener: (() => void) | null = null;
let onUpdatedListener: ((tabId: number, changeInfo: { url?: string; status?: string }) => void) | null = null;
let onMessageListener: ((msg: { type?: string }) => void) | null = null;

const ATS_RESULT = {
  heuristics: { checks: [], score: 80 },
  analysis: { score: 80, summary: 'ok', strengths: [], missingKeywords: [], recommendations: [], skillScores: [] },
  cached: false,
  courses: [],
};

// Helper: builds a sendMessage mock that returns a Promise when no callback is given
// (GET_PAGE_TEXT pattern) and invokes the callback when provided (ANALYZE pattern).
function mockSendMessageWith(handler: (msg: { type: string }) => unknown) {
  (sendMessageMock as ReturnType<typeof vi.fn>).mockImplementation(
    (msg: { type: string }, cb?: (res: unknown) => void) => {
      const res = handler(msg);
      if (cb) {
        cb(res);
        return undefined;
      }
      return Promise.resolve(res);
    },
  );
}

beforeEach(() => {
  vi.stubGlobal('chrome', {
    runtime: {
      sendMessage: sendMessageMock,
      lastError: null,
      onMessage: {
        addListener: vi.fn((cb: typeof onMessageListener) => {
          onMessageListener = cb;
        }),
        removeListener: vi.fn(() => {
          onMessageListener = null;
        }),
      },
    },
    tabs: {
      onActivated: {
        addListener: vi.fn((cb: typeof onActivatedListener) => {
          onActivatedListener = cb;
        }),
        removeListener: vi.fn(() => {
          onActivatedListener = null;
        }),
      },
      onUpdated: {
        addListener: vi.fn((cb: typeof onUpdatedListener) => {
          onUpdatedListener = cb;
        }),
        removeListener: vi.fn(() => {
          onUpdatedListener = null;
        }),
      },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  onActivatedListener = null;
  onUpdatedListener = null;
  onMessageListener = null;
});

function setupConnectedRef(connected: boolean | null = true) {
  return { current: connected };
}

describe('useJobAnalysis', () => {
  it('should_start_in_loading_state', () => {
    mockSendMessageWith((msg) => {
      if (msg.type === 'GET_PAGE_TEXT') return { text: 'job text', url: 'https://example.com' };
      return undefined;
    });
    const { result } = renderHook(() => useJobAnalysis({ connectedRef: setupConnectedRef() }));
    expect(result.current.state.status).toBe('loading');
  });

  it('should_analyze_active_tab_on_mount', async () => {
    mockSendMessageWith((msg) => {
      if (msg.type === 'GET_PAGE_TEXT') return { text: 'job text', url: 'https://example.com' };
      if (msg.type === 'ANALYZE') return ATS_RESULT;
      return undefined;
    });
    const { result } = renderHook(() => useJobAnalysis({ connectedRef: setupConnectedRef() }));

    await waitFor(() => {
      expect(result.current.state.status).toBe('done');
    });
    expect(result.current.currentUrl).toBe('https://example.com');
    expect(sendMessageMock).toHaveBeenCalledWith({ type: 'GET_PAGE_TEXT' });
    expect(sendMessageMock).toHaveBeenCalledWith({ type: 'ANALYZE', jobDescription: 'job text' }, expect.any(Function));
  });

  it('should_set_NO_TEXT_error_when_no_text_found', async () => {
    mockSendMessageWith((msg) => {
      if (msg.type === 'GET_PAGE_TEXT') return { text: '', url: 'https://example.com' };
      return undefined;
    });
    const { result } = renderHook(() => useJobAnalysis({ connectedRef: setupConnectedRef() }));

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });
    expect(result.current.state).toMatchObject({ code: 'NO_TEXT' });
  });

  it('should_set_UNKNOWN_error_when_no_response_from_background', async () => {
    mockSendMessageWith((msg) => {
      if (msg.type === 'GET_PAGE_TEXT') return { text: 'job text', url: 'https://example.com' };
      if (msg.type === 'ANALYZE') return undefined; // no response
      return undefined;
    });
    const { result } = renderHook(() => useJobAnalysis({ connectedRef: setupConnectedRef() }));

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });
    expect(result.current.state).toMatchObject({ code: 'UNKNOWN', message: 'Sem resposta da extensão.' });
  });

  it('should_map_backend_error_to_error_state_with_message', async () => {
    mockSendMessageWith((msg) => {
      if (msg.type === 'GET_PAGE_TEXT') return { text: 'job text', url: 'https://example.com' };
      if (msg.type === 'ANALYZE') return { error: 'RATE_LIMITED' };
      return undefined;
    });
    const { result } = renderHook(() => useJobAnalysis({ connectedRef: setupConnectedRef() }));

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });
    expect(result.current.state).toMatchObject({ code: 'RATE_LIMITED' });
    if (result.current.state.status === 'error') {
      expect(result.current.state.message).toContain('Aguarde');
    } else {
      throw new Error('expected error state');
    }
  });

  it('should_discard_stale_analysis_responses', async () => {
    let analyzeCallback: ((res: unknown) => void) | null = null;
    (sendMessageMock as ReturnType<typeof vi.fn>).mockImplementation(
      (msg: { type: string }, cb?: (res: unknown) => void) => {
        if (msg.type === 'GET_PAGE_TEXT') return Promise.resolve({ text: 'job text', url: 'https://example.com' });
        if (msg.type === 'ANALYZE') {
          analyzeCallback = cb ?? null;
          return undefined;
        }
        return undefined;
      },
    );
    const { result } = renderHook(() => useJobAnalysis({ connectedRef: setupConnectedRef() }));

    await waitFor(() => {
      expect(analyzeCallback).not.toBeNull();
    });

    // Start a second analysis (force) — this invalidates the first requestId
    act(() => {
      result.current.analyzeActiveTab(true);
    });

    // Resolve the FIRST analyze callback — it should be discarded (stale)
    act(() => {
      analyzeCallback?.(ATS_RESULT);
    });

    // State should still be loading (second analysis in progress)
    expect(result.current.state.status).toBe('loading');
  });

  it('should_not_reanalyze_same_text_without_force', async () => {
    let analyzeCount = 0;
    mockSendMessageWith((msg) => {
      if (msg.type === 'GET_PAGE_TEXT') return { text: 'same text', url: 'https://example.com' };
      if (msg.type === 'ANALYZE') {
        analyzeCount++;
        return ATS_RESULT;
      }
      return undefined;
    });
    const { result } = renderHook(() => useJobAnalysis({ connectedRef: setupConnectedRef() }));

    await waitFor(() => {
      expect(result.current.state.status).toBe('done');
    });
    expect(analyzeCount).toBe(1);

    // Trigger onActivated (auto re-analysis without force) — same text → skip
    act(() => {
      onActivatedListener?.();
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(analyzeCount).toBe(1);
  });

  it('should_reanalyze_same_text_with_force', async () => {
    let analyzeCount = 0;
    mockSendMessageWith((msg) => {
      if (msg.type === 'GET_PAGE_TEXT') return { text: 'same text', url: 'https://example.com' };
      if (msg.type === 'ANALYZE') {
        analyzeCount++;
        return ATS_RESULT;
      }
      return undefined;
    });
    const { result } = renderHook(() => useJobAnalysis({ connectedRef: setupConnectedRef() }));

    await waitFor(() => {
      expect(result.current.state.status).toBe('done');
    });
    expect(analyzeCount).toBe(1);

    act(() => {
      result.current.analyzeActiveTab(true);
    });

    await waitFor(() => {
      expect(analyzeCount).toBe(2);
    });
  });

  it('should_trigger_analysis_on_tab_activation_when_active', async () => {
    let analyzeCount = 0;
    let pageText = 'job text';
    mockSendMessageWith((msg) => {
      if (msg.type === 'GET_PAGE_TEXT') return { text: pageText, url: 'https://example.com' };
      if (msg.type === 'ANALYZE') {
        analyzeCount++;
        return ATS_RESULT;
      }
      return undefined;
    });
    const { result } = renderHook(() => useJobAnalysis({ connectedRef: setupConnectedRef() }));

    await waitFor(() => {
      expect(result.current.state.status).toBe('done');
    });

    // Page content changed → tab activation triggers a new analysis
    pageText = 'job text v2';
    act(() => {
      onActivatedListener?.();
    });

    await waitFor(() => {
      expect(analyzeCount).toBe(2);
    });
  });

  it('should_trigger_analysis_on_tab_update_with_url_when_active', async () => {
    let analyzeCount = 0;
    let pageText = 'job text';
    mockSendMessageWith((msg) => {
      if (msg.type === 'GET_PAGE_TEXT') return { text: pageText, url: 'https://example.com' };
      if (msg.type === 'ANALYZE') {
        analyzeCount++;
        return ATS_RESULT;
      }
      return undefined;
    });
    const { result } = renderHook(() => useJobAnalysis({ connectedRef: setupConnectedRef() }));

    await waitFor(() => {
      expect(result.current.state.status).toBe('done');
    });

    // Page content changed → tab update with url triggers a new analysis
    pageText = 'job text v2';
    act(() => {
      onUpdatedListener?.(1, { url: 'https://example.com/new' });
    });

    await waitFor(() => {
      expect(analyzeCount).toBe(2);
    });
  });

  it('should_not_trigger_analysis_on_tab_update_without_url', async () => {
    let analyzeCount = 0;
    mockSendMessageWith((msg) => {
      if (msg.type === 'GET_PAGE_TEXT') return { text: 'job text', url: 'https://example.com' };
      if (msg.type === 'ANALYZE') {
        analyzeCount++;
        return ATS_RESULT;
      }
      return undefined;
    });
    const { result } = renderHook(() => useJobAnalysis({ connectedRef: setupConnectedRef() }));

    await waitFor(() => {
      expect(result.current.state.status).toBe('done');
    });

    act(() => {
      onUpdatedListener?.(1, { status: 'loading' }); // no url
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(analyzeCount).toBe(1);
  });

  it('should_trigger_analysis_on_PAGE_CHANGED_message_when_active', async () => {
    let analyzeCount = 0;
    let pageText = 'job text';
    mockSendMessageWith((msg) => {
      if (msg.type === 'GET_PAGE_TEXT') return { text: pageText, url: 'https://example.com' };
      if (msg.type === 'ANALYZE') {
        analyzeCount++;
        return ATS_RESULT;
      }
      return undefined;
    });
    const { result } = renderHook(() => useJobAnalysis({ connectedRef: setupConnectedRef() }));

    await waitFor(() => {
      expect(result.current.state.status).toBe('done');
    });

    // Page content changed → PAGE_CHANGED message triggers a new analysis
    pageText = 'job text v2';
    act(() => {
      onMessageListener?.({ type: 'PAGE_CHANGED' });
    });

    await waitFor(() => {
      expect(analyzeCount).toBe(2);
    });
  });

  it('should_not_trigger_analysis_on_other_message_types', async () => {
    let analyzeCount = 0;
    mockSendMessageWith((msg) => {
      if (msg.type === 'GET_PAGE_TEXT') return { text: 'job text', url: 'https://example.com' };
      if (msg.type === 'ANALYZE') {
        analyzeCount++;
        return ATS_RESULT;
      }
      return undefined;
    });
    const { result } = renderHook(() => useJobAnalysis({ connectedRef: setupConnectedRef() }));

    await waitFor(() => {
      expect(result.current.state.status).toBe('done');
    });

    act(() => {
      onMessageListener?.({ type: 'SOMETHING_ELSE' });
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(analyzeCount).toBe(1);
  });

  it('should_not_auto_reanalyze_when_disconnected', async () => {
    let analyzeCount = 0;
    mockSendMessageWith((msg) => {
      if (msg.type === 'GET_PAGE_TEXT') return { text: 'job text', url: 'https://example.com' };
      if (msg.type === 'ANALYZE') {
        analyzeCount++;
        return ATS_RESULT;
      }
      return undefined;
    });
    const connectedRef = setupConnectedRef(false); // disconnected
    const { result } = renderHook(() => useJobAnalysis({ connectedRef }));

    await waitFor(() => {
      expect(result.current.state.status).toBe('done');
    });

    act(() => {
      onActivatedListener?.();
      onMessageListener?.({ type: 'PAGE_CHANGED' });
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(analyzeCount).toBe(1);
  });

  it('should_remove_listeners_on_unmount', () => {
    mockSendMessageWith((msg) => {
      if (msg.type === 'GET_PAGE_TEXT') return { text: 'job text', url: 'https://example.com' };
      return undefined;
    });
    const { unmount } = renderHook(() => useJobAnalysis({ connectedRef: setupConnectedRef() }));

    unmount();
    expect(chrome.tabs.onActivated.removeListener).toHaveBeenCalled();
    expect(chrome.tabs.onUpdated.removeListener).toHaveBeenCalled();
    expect(chrome.runtime.onMessage.removeListener).toHaveBeenCalled();
  });
});