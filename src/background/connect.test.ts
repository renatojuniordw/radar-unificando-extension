import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('connect module', () => {
  const mockStorage: Record<string, unknown> = {};

  beforeEach(() => {
    vi.stubGlobal('chrome', {
      identity: {
        getRedirectURL: vi.fn(() => 'https://extensions.google.com/redirect'),
        launchWebAuthFlow: vi.fn(),
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
      },
    });

    vi.stubGlobal('console', {
      ...console,
      error: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  describe('disconnect', () => {
    it('should_remove_the_token_when_disconnecting', async () => {
      mockStorage['extensionToken'] = 'token-to-delete';
      const { disconnect } = await import('./connect');
      await disconnect();

      expect(mockStorage['extensionToken']).toBeUndefined();
    });
  });

  describe('getOrConnectToken', () => {
    it('should_return_an_existing_token_without_starting_auth_flow', async () => {
      mockStorage['extensionToken'] = 'existing-token';
      const { getOrConnectToken } = await import('./connect');

      const result = await getOrConnectToken();
      expect(result).toBe('existing-token');
      expect(chrome.identity.launchWebAuthFlow).not.toHaveBeenCalled();
    });

    it('should_start_auth_flow_when_no_token_exists', async () => {
      (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mockResolvedValue(
        'https://extensions.google.com/redirect?token=new-token'
      );

      const { getOrConnectToken } = await import('./connect');
      const result = await getOrConnectToken();

      expect(chrome.identity.launchWebAuthFlow).toHaveBeenCalled();
      expect(result).toBe('new-token');
      expect(mockStorage['extensionToken']).toBe('new-token');
    });

    it('should_return_null_when_auth_flow_is_cancelled', async () => {
      (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { getOrConnectToken } = await import('./connect');
      const result = await getOrConnectToken();

      expect(result).toBeNull();
      expect(mockStorage['extensionToken']).toBeUndefined();
    });

    it('should_return_null_when_launchWebAuthFlow_throws_an_error', async () => {
      (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('User cancelled')
      );

      const { getOrConnectToken } = await import('./connect');
      const result = await getOrConnectToken();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('should_return_null_when_redirect_url_has_no_token_parameter', async () => {
      (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mockResolvedValue(
        'https://extensions.google.com/redirect'
      );

      const { getOrConnectToken } = await import('./connect');
      const result = await getOrConnectToken();

      expect(result).toBeNull();
      expect(mockStorage['extensionToken']).toBeUndefined();
    });

    it('should_log_the_error_and_url_on_failure', async () => {
      (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      const { getOrConnectToken } = await import('./connect');
      await getOrConnectToken();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[extension] Falha na conexão'),
        expect.objectContaining({ message: 'Network error' }),
      );
    });
  });

  describe('connect (single-flight)', () => {
    it('should_share_the_same_promise_across_concurrent_calls', async () => {
      (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('https://redirect?token=tok1'), 100))
      );

      const { connect } = await import('./connect');

      const [r1, r2, r3] = await Promise.all([connect(), connect(), connect()]);

      expect(chrome.identity.launchWebAuthFlow).toHaveBeenCalledTimes(1);
      expect(r1).toBe('tok1');
      expect(r2).toBe('tok1');
      expect(r3).toBe('tok1');
    });

    it('should_allow_a_new_flow_after_previous_completes', async () => {
      let callCount = 0;
      (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(`https://redirect?token=tok${++callCount}`), 50)
          )
      );

      const { connect } = await import('./connect');

      const r1 = await connect();
      expect(r1).toBe('tok1');
      expect(chrome.identity.launchWebAuthFlow).toHaveBeenCalledTimes(1);

      const r2 = await connect();
      expect(r2).toBe('tok2');
      expect(chrome.identity.launchWebAuthFlow).toHaveBeenCalledTimes(2);
    });

    it('should_reset_connect_promise_when_connect_flow_fails', async () => {
      (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('https://redirect?token=tok1');

      const { connect } = await import('./connect');

      const r1 = await connect();
      expect(r1).toBeNull();

      const r2 = await connect();
      expect(r2).toBe('tok1');
      expect(mockStorage['extensionToken']).toBe('tok1');
    });
  });
});