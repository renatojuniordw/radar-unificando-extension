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
    it('remove o token ao desconectar', async () => {
      mockStorage['extensionToken'] = 'token-to-delete';
      const { disconnect } = await import('./connect');
      await disconnect();

      expect(mockStorage['extensionToken']).toBeUndefined();
    });
  });

  describe('getOrConnectToken', () => {
    it('retorna token existente sem iniciar fluxo de auth', async () => {
      mockStorage['extensionToken'] = 'existing-token';
      const { getOrConnectToken } = await import('./connect');

      const result = await getOrConnectToken();
      expect(result).toBe('existing-token');
      expect(chrome.identity.launchWebAuthFlow).not.toHaveBeenCalled();
    });

    it('inicia fluxo de auth quando não há token', async () => {
      (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mockResolvedValue(
        'https://extensions.google.com/redirect?token=new-token'
      );

      const { getOrConnectToken } = await import('./connect');
      const result = await getOrConnectToken();

      expect(chrome.identity.launchWebAuthFlow).toHaveBeenCalled();
      expect(result).toBe('new-token');
      expect(mockStorage['extensionToken']).toBe('new-token');
    });

    it('retorna null quando o fluxo de auth é cancelado', async () => {
      (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { getOrConnectToken } = await import('./connect');
      const result = await getOrConnectToken();

      expect(result).toBeNull();
      expect(mockStorage['extensionToken']).toBeUndefined();
    });

    it('retorna null quando launchWebAuthFlow lança erro', async () => {
      (chrome.identity.launchWebAuthFlow as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('User cancelled')
      );

      const { getOrConnectToken } = await import('./connect');
      const result = await getOrConnectToken();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('connect (single-flight)', () => {
    it('compartilha a mesma promise em chamadas concorrentes', async () => {
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
  });
});
