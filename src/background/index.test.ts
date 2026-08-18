import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

// ─── Chrome API mocks ───────────────────────────────────────────────────────
const mockSendMessage = vi.fn();
let messageCallback: ((msg: unknown, sender: unknown, sendResponse: (res: unknown) => void) => void) | null = null;

vi.stubGlobal('chrome', {
  sidePanel: { setPanelBehavior: vi.fn(async () => {}) },
  tabs: {
    query: vi.fn(async () => [{ id: 1, url: 'https://example.com/job/1', title: 'React Dev' }]),
    sendMessage: vi.fn(async () => ({ text: 'React job text', url: 'https://example.com/job/1' })),
  },
  scripting: {
    executeScript: vi.fn(async () => []),
  },
  runtime: {
    sendMessage: mockSendMessage,
    onMessage: {
      addListener: vi.fn((cb: typeof messageCallback) => {
        messageCallback = cb;
      }),
    },
    getManifest: vi.fn(() => ({
      content_scripts: [{ js: ['src/content/index.js'] }],
    })),
    lastError: null,
  },
  action: {
    setBadgeText: vi.fn(async () => {}),
    setBadgeBackgroundColor: vi.fn(async () => {}),
  },
});

// ─── Module mocks ───────────────────────────────────────────────────────────
const mockAnalyzeJob = vi.fn();
const mockSendFeedback = vi.fn();
vi.mock('./api', () => ({
  analyzeJob: mockAnalyzeJob,
  sendFeedback: mockSendFeedback,
}));

const mockGetOrConnectToken = vi.fn();
const mockDisconnect = vi.fn();
vi.mock('./connect', () => ({
  getOrConnectToken: mockGetOrConnectToken,
  disconnect: mockDisconnect,
}));

const mockSetScoreBadge = vi.fn(async () => {});
const mockClearBadge = vi.fn(async () => {});
vi.mock('./badge', () => ({
  setScoreBadge: mockSetScoreBadge,
  clearBadge: mockClearBadge,
}));

const mockGetToken = vi.fn();
const mockClearToken = vi.fn(async () => {});
const mockAddHistory = vi.fn(async () => {});
const mockGetCachedAnalysis = vi.fn();
const mockSetCachedAnalysis = vi.fn(async () => {});
const mockHashText = vi.fn((text: string) => String([...text].reduce((h, c) => ((h << 5) + h + c.charCodeAt(0)) >>> 0, 5381)));
vi.mock('../shared/storage', () => ({
  getToken: mockGetToken,
  clearToken: mockClearToken,
  addHistory: mockAddHistory,
  getCachedAnalysis: mockGetCachedAnalysis,
  setCachedAnalysis: mockSetCachedAnalysis,
  hashText: mockHashText,
}));

// Suppress console noise
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  // Reset all module mocks
  mockAnalyzeJob.mockReset();
  mockSendFeedback.mockReset();
  mockGetOrConnectToken.mockReset();
  mockDisconnect.mockReset();
  mockSetScoreBadge.mockReset();
  mockClearBadge.mockReset();
  mockGetToken.mockReset();
  mockClearToken.mockReset();
  mockAddHistory.mockReset();
  mockGetCachedAnalysis.mockReset();
  mockSetCachedAnalysis.mockReset();
  mockHashText.mockReset();
  mockHashText.mockImplementation((text: string) => String([...text].reduce((h, c) => ((h << 5) + h + c.charCodeAt(0)) >>> 0, 5381)));
});

// Helper to send a message and get the response
function sendMessage(msg: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve) => {
    messageCallback!(msg, {}, resolve as (r: unknown) => void);
  });
}

// Import module once (registers listener via onMessage.addListener)
beforeAll(async () => {
  await import('./index');
  // Allow microtask flush (sidePanel.setPanelBehavior etc.)
  await new Promise((r) => setTimeout(r, 0));
});

describe('background/index — message router', () => {
  // ─── GET_STATUS ──────────────────────────────────────────────────────────
  describe('GET_STATUS', () => {
    it('should_return_connected_true_when_token_exists', async () => {
      mockGetToken.mockResolvedValue('my-token');
      const res = await sendMessage({ type: 'GET_STATUS' });
      expect(res).toEqual({ connected: true });
    });

    it('should_return_connected_false_when_no_token', async () => {
      mockGetToken.mockResolvedValue(null);
      const res = await sendMessage({ type: 'GET_STATUS' });
      expect(res).toEqual({ connected: false });
    });

    it('should_return_connected_false_when_getToken_throws', async () => {
      mockGetToken.mockRejectedValue(new Error('storage error'));
      const res = await sendMessage({ type: 'GET_STATUS' });
      expect(res).toEqual({ connected: false });
    });
  });

  // ─── CONNECT ─────────────────────────────────────────────────────────────
  describe('CONNECT', () => {
    it('should_return_connected_true_when_connect_succeeds', async () => {
      mockGetOrConnectToken.mockResolvedValue('new-token');
      const res = await sendMessage({ type: 'CONNECT' });
      expect(res).toEqual({ connected: true });
    });

    it('should_return_connected_false_when_connect_fails', async () => {
      mockGetOrConnectToken.mockRejectedValue(new Error('auth failed'));
      const res = await sendMessage({ type: 'CONNECT' });
      expect(res).toEqual({ connected: false });
    });
  });

  // ─── DISCONNECT ──────────────────────────────────────────────────────────
  describe('DISCONNECT', () => {
    it('should_disconnect_clear_badge_and_return_ok', async () => {
      mockDisconnect.mockResolvedValue(undefined);
      const res = await sendMessage({ type: 'DISCONNECT' });
      expect(mockDisconnect).toHaveBeenCalled();
      expect(mockClearBadge).toHaveBeenCalled();
      expect(res).toEqual({ ok: true });
    });

    it('should_return_ok_false_when_disconnect_throws', async () => {
      mockDisconnect.mockRejectedValue(new Error('storage error'));
      const res = await sendMessage({ type: 'DISCONNECT' });
      expect(res).toEqual({ ok: false });
    });
  });

  // ─── GET_PAGE_TEXT ────────────────────────────────────────────────────────
  describe('GET_PAGE_TEXT', () => {
    it('should_return_text_and_url_from_active_tab', async () => {
      const res = await sendMessage({ type: 'GET_PAGE_TEXT' });
      expect(res).toEqual({ text: 'React job text', url: 'https://example.com/job/1' });
    });

    it('should_return_empty_when_no_active_tab', async () => {
      (chrome.tabs.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
      const res = await sendMessage({ type: 'GET_PAGE_TEXT' });
      expect(res).toEqual({ text: '', url: '' });
    });

    it('should_inject_content_script_on_first_attempt_failure_then_retry', async () => {
      (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('no listener'))
        .mockResolvedValueOnce({ text: 'injected text', url: 'https://example.com' });

      vi.useFakeTimers();
      const resPromise = sendMessage({ type: 'GET_PAGE_TEXT' });
      await vi.advanceTimersByTimeAsync(400);

      const res = await resPromise;
      expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 1 },
        files: ['src/content/index.js'],
      });
      expect(res).toEqual({ text: 'injected text', url: 'https://example.com' });
    });

    it('should_return_empty_text_after_all_attempts_fail', async () => {
      (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

      vi.useFakeTimers();
      const resPromise = sendMessage({ type: 'GET_PAGE_TEXT' });
      await vi.advanceTimersByTimeAsync(1000);

      const res = await resPromise;
      expect(res).toEqual({ text: '', url: '' });
    });

    it('should_skip_content_script_injection_when_manifest_has_no_content_script', async () => {
      (chrome.runtime.getManifest as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        content_scripts: [],
      });
      (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('no listener'))
        .mockResolvedValueOnce({ text: 'text', url: 'https://example.com' });

      vi.useFakeTimers();
      const resPromise = sendMessage({ type: 'GET_PAGE_TEXT' });
      await vi.advanceTimersByTimeAsync(400);

      await resPromise;
      expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
    });
  });

  // ─── PAGE_CHANGED ────────────────────────────────────────────────────────
  describe('PAGE_CHANGED', () => {
    it('should_not_send_any_response_for_PAGE_CHANGED', async () => {
      const resPromise = sendMessage({ type: 'PAGE_CHANGED' });
      const timeout = new Promise((resolve) => setTimeout(resolve, 50));
      const result = await Promise.race([resPromise, timeout.then(() => 'timeout')]);
      expect(result).toBe('timeout');
    });
  });

  // ─── default ─────────────────────────────────────────────────────────────
  describe('unknown message type', () => {
    it('should_return_UNKNOWN_error_for_unrecognized_message_type', async () => {
      const res = await sendMessage({ type: 'SOME_OTHER_THING' });
      expect(res).toEqual({ error: 'UNKNOWN' });
    });
  });
});

// ─── handleAnalyze ─────────────────────────────────────────────────────────
describe('handleAnalyze', () => {
  it('should_return_cached_result_when_cache_hit', async () => {
    const cachedResult = {
      analysis: { score: 85 },
      cached: true,
      heuristics: { checks: [], score: 85 },
      courses: [],
    };
    mockGetCachedAnalysis.mockResolvedValue(cachedResult);
    mockHashText.mockReturnValue('hash123');

    const res = await sendMessage({ type: 'ANALYZE', jobDescription: 'React job' });

    expect(mockHashText).toHaveBeenCalledWith('React job');
    expect(mockGetCachedAnalysis).toHaveBeenCalledWith('hash123');
    expect(mockSetScoreBadge).toHaveBeenCalledWith(85);
    expect(mockAnalyzeJob).not.toHaveBeenCalled();
    expect(res).toEqual(cachedResult);
  });

  it('should_return_NOT_CONNECTED_when_no_token', async () => {
    mockGetCachedAnalysis.mockResolvedValue(null);
    mockGetToken.mockResolvedValue(null);

    const res = await sendMessage({ type: 'ANALYZE', jobDescription: 'React job' });
    expect(res).toEqual({ error: 'NOT_CONNECTED' });
    expect(mockAnalyzeJob).not.toHaveBeenCalled();
  });

  it('should_call_analyzeJob_with_token_jobDescription_and_tab_title', async () => {
    mockGetCachedAnalysis.mockResolvedValue(null);
    mockGetToken.mockResolvedValue('my-token');
    mockAnalyzeJob.mockResolvedValue({
      analysis: { score: 70 },
      heuristics: { checks: [], score: 70 },
      cached: false,
      courses: [],
    });

    await sendMessage({ type: 'ANALYZE', jobDescription: 'React job' });

    expect(mockAnalyzeJob).toHaveBeenCalledWith('my-token', 'React job', 'React Dev');
  });

  it('should_clear_token_and_return_NOT_CONNECTED_when_backend_returns_401', async () => {
    mockGetCachedAnalysis.mockResolvedValue(null);
    mockGetToken.mockResolvedValue('expired-token');
    mockAnalyzeJob.mockResolvedValue({ error: 'NOT_CONNECTED' });

    const res = await sendMessage({ type: 'ANALYZE', jobDescription: 'React job' });

    expect(mockClearToken).toHaveBeenCalled();
    expect(res).toEqual({ error: 'NOT_CONNECTED' });
  });

  it('should_set_badge_cache_and_history_on_successful_analysis', async () => {
    const result = {
      analysis: { score: 80 },
      heuristics: { checks: [], score: 80 },
      cached: false,
      courses: [],
    };
    mockGetCachedAnalysis.mockResolvedValue(null);
    mockGetToken.mockResolvedValue('token');
    mockAnalyzeJob.mockResolvedValue(result);
    mockHashText.mockReturnValue('hash-key');

    const res = await sendMessage({ type: 'ANALYZE', jobDescription: 'React' });

    expect(mockSetScoreBadge).toHaveBeenCalledWith(80);
    expect(mockSetCachedAnalysis).toHaveBeenCalledWith('hash-key', result);
    expect(mockAddHistory).toHaveBeenCalledWith({
      url: 'https://example.com/job/1',
      title: 'React Dev',
      score: 80,
      date: expect.any(String),
    });
    expect(res).toEqual(result);
  });

  it('should_convert_undefined_jobDescription_to_empty_string', async () => {
    mockGetCachedAnalysis.mockResolvedValue(null);
    mockGetToken.mockResolvedValue(null);

    await sendMessage({ type: 'ANALYZE' });
    expect(mockHashText).toHaveBeenCalledWith('');
  });

  it('should_not_add_history_when_no_active_tab', async () => {
    (chrome.tabs.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    const result = {
      analysis: { score: 70 },
      heuristics: { checks: [], score: 70 },
      cached: false,
      courses: [],
    };
    mockGetCachedAnalysis.mockResolvedValue(null);
    mockGetToken.mockResolvedValue('token');
    mockAnalyzeJob.mockResolvedValue(result);
    mockHashText.mockReturnValue('hash-key');

    await sendMessage({ type: 'ANALYZE', jobDescription: 'job' });
    expect(mockAddHistory).not.toHaveBeenCalled();
  });

  it('should_return_error_when_analyzeJob_throws', async () => {
    mockGetCachedAnalysis.mockResolvedValue(null);
    mockGetToken.mockResolvedValue('token');
    mockAnalyzeJob.mockRejectedValue(new Error('network down'));

    const res = await sendMessage({ type: 'ANALYZE', jobDescription: 'React' });
    expect(res).toEqual({ error: 'UNKNOWN', message: 'Error: network down' });
  });
});

// ─── handleFeedback ────────────────────────────────────────────────────────
describe('handleFeedback', () => {
  it('should_send_feedback_when_token_exists', async () => {
    mockGetToken.mockResolvedValue('token');
    mockSendFeedback.mockResolvedValue({ ok: true });

    const res = await sendMessage({ type: 'FEEDBACK', rating: true, comment: 'útil' });
    expect(mockSendFeedback).toHaveBeenCalledWith('token', true, 'útil');
    expect(res).toEqual({ ok: true });
  });

  it('should_return_NOT_CONNECTED_when_no_token', async () => {
    mockGetToken.mockResolvedValue(null);
    const res = await sendMessage({ type: 'FEEDBACK', rating: true });
    expect(res).toEqual({ error: 'NOT_CONNECTED' });
  });

  it('should_clear_token_when_backend_returns_NOT_CONNECTED', async () => {
    mockGetToken.mockResolvedValue('expired-token');
    mockSendFeedback.mockResolvedValue({ error: 'NOT_CONNECTED' });

    const res = await sendMessage({ type: 'FEEDBACK', rating: false });
    expect(mockClearToken).toHaveBeenCalled();
    expect(res).toEqual({ error: 'NOT_CONNECTED' });
  });

  it('should_return_UNKNOWN_error_for_backend_failure', async () => {
    mockGetToken.mockResolvedValue('token');
    mockSendFeedback.mockResolvedValue({ error: 'UNKNOWN' });

    const res = await sendMessage({ type: 'FEEDBACK', rating: true });
    expect(res).toEqual({ error: 'UNKNOWN' });
  });
});