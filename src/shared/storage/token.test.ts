import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('token storage', () => {
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

  it('getToken retorna null quando não há token', async () => {
    const { getToken } = await import('./token');
    const result = await getToken();
    expect(result).toBeNull();
  });

  it('getToken retorna o token salvo', async () => {
    const { getToken } = await import('./token');
    mockStorage['extensionToken'] = 'my-secret-token';

    const result = await getToken();
    expect(result).toBe('my-secret-token');
  });

  it('setToken salva o token no storage', async () => {
    const { setToken, getToken } = await import('./token');
    await setToken('new-token');

    expect(mockStorage['extensionToken']).toBe('new-token');
    const stored = await getToken();
    expect(stored).toBe('new-token');
  });

  it('clearToken remove o token do storage', async () => {
    const { setToken, clearToken, getToken } = await import('./token');
    await setToken('token-to-delete');
    await clearToken();

    const result = await getToken();
    expect(result).toBeNull();
  });
});
