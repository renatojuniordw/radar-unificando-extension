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

  it('should_return_null_when_no_token_is_stored', async () => {
    const { getToken } = await import('./token');
    const result = await getToken();
    expect(result).toBeNull();
  });

  it('should_return_the_stored_token', async () => {
    const { getToken } = await import('./token');
    mockStorage['extensionToken'] = 'my-secret-token';

    const result = await getToken();
    expect(result).toBe('my-secret-token');
  });

  it('should_return_empty_string_token_as_is_without_null_coercion', async () => {
    const { getToken } = await import('./token');
    mockStorage['extensionToken'] = '';

    const result = await getToken();
    expect(result).toBe('');
  });

  it('should_save_the_token_under_the_extension_token_key', async () => {
    const { setToken, getToken } = await import('./token');
    await setToken('new-token');

    expect(mockStorage['extensionToken']).toBe('new-token');
    const stored = await getToken();
    expect(stored).toBe('new-token');
  });

  it('should_overwrite_a_previously_stored_token', async () => {
    const { setToken, getToken } = await import('./token');
    await setToken('first-token');
    await setToken('second-token');

    expect(mockStorage['extensionToken']).toBe('second-token');
    const stored = await getToken();
    expect(stored).toBe('second-token');
  });

  it('should_remove_the_token_from_storage', async () => {
    const { setToken, clearToken, getToken } = await import('./token');
    await setToken('token-to-delete');
    await clearToken();

    const result = await getToken();
    expect(result).toBeNull();
  });
});