import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { useConnection } from './useConnection';

let sendMessageMock: ReturnType<typeof vi.fn>;
let storageChangeListener: ((changes: Record<string, { newValue?: unknown }>, areaName: string) => void) | null = null;

beforeEach(() => {
  sendMessageMock = vi.fn();
  vi.stubGlobal('chrome', {
    runtime: {
      sendMessage: sendMessageMock,
      lastError: null,
    },
    storage: {
      onChanged: {
        addListener: vi.fn((cb: typeof storageChangeListener) => {
          storageChangeListener = cb;
        }),
        removeListener: vi.fn(() => {
          storageChangeListener = null;
        }),
      },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  storageChangeListener = null;
});

describe('useConnection', () => {
  it('should_start_with_connected_null', () => {
    const { result } = renderHook(() => useConnection());
    expect(result.current.connected).toBeNull();
    expect(result.current.connectedRef.current).toBeNull();
  });

  it('should_set_connected_from_GET_STATUS_response', async () => {
    sendMessageMock.mockImplementation((_msg: { type: string }, cb: (res: unknown) => void) => cb({ connected: true }));
    const { result } = renderHook(() => useConnection());

    act(() => {
      result.current.refreshStatus();
    });

    await waitFor(() => {
      expect(result.current.connected).toBe(true);
      expect(result.current.connectedRef.current).toBe(true);
    });
    expect(sendMessageMock).toHaveBeenCalledWith({ type: 'GET_STATUS' }, expect.any(Function));
  });

  it('should_set_connected_false_when_GET_STATUS_returns_no_connection', async () => {
    sendMessageMock.mockImplementation((_msg: { type: string }, cb: (res: unknown) => void) => cb({ connected: false }));
    const { result } = renderHook(() => useConnection());

    act(() => {
      result.current.refreshStatus();
    });

    await waitFor(() => {
      expect(result.current.connected).toBe(false);
    });
  });

  it('should_connect_and_refresh_status', async () => {
    sendMessageMock.mockImplementation((_msg: { type: string }, cb: (res: unknown) => void) => cb({ connected: true }));
    const onConnected = vi.fn();
    const { result } = renderHook(() => useConnection({ onConnected }));

    act(() => {
      result.current.connect();
    });

    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });
    expect(sendMessageMock).toHaveBeenCalledWith({ type: 'CONNECT' }, expect.any(Function));
    expect(onConnected).toHaveBeenCalled();
  });

  it('should_not_call_onConnected_when_connect_fails', async () => {
    sendMessageMock.mockImplementation((_msg: { type: string }, cb: (res: unknown) => void) => cb({ connected: false }));
    const onConnected = vi.fn();
    const { result } = renderHook(() => useConnection({ onConnected }));

    act(() => {
      result.current.connect();
    });

    await waitFor(() => {
      expect(result.current.connected).toBe(false);
    });
    expect(onConnected).not.toHaveBeenCalled();
  });

  it('should_optimistically_set_disconnected_before_sending_DISCONNECT', async () => {
    sendMessageMock.mockImplementation((_msg: { type: string }, cb: (res: unknown) => void) => cb({ connected: false }));
    const { result } = renderHook(() => useConnection());

    act(() => {
      result.current.disconnect();
    });

    // Optimistic update happens synchronously
    expect(result.current.connected).toBe(false);
    expect(result.current.connectedRef.current).toBe(false);
    expect(sendMessageMock).toHaveBeenCalledWith({ type: 'DISCONNECT' }, expect.any(Function));
  });

  it('should_react_to_extensionToken_storage_changes', async () => {
    sendMessageMock.mockImplementation((_msg: { type: string }, cb: (res: unknown) => void) => cb({ connected: true }));
    const onConnected = vi.fn();
    renderHook(() => useConnection({ onConnected }));

    act(() => {
      storageChangeListener?.({ extensionToken: { newValue: 'new-token' } }, 'local');
    });

    await waitFor(() => {
      expect(onConnected).toHaveBeenCalled();
    });
    expect(sendMessageMock).toHaveBeenCalledWith({ type: 'GET_STATUS' }, expect.any(Function));
  });

  it('should_ignore_storage_changes_for_other_keys', async () => {
    sendMessageMock.mockImplementation((_msg: { type: string }, cb: (res: unknown) => void) => cb({ connected: true }));
    const onConnected = vi.fn();
    renderHook(() => useConnection({ onConnected }));

    act(() => {
      storageChangeListener?.({ otherKey: { newValue: 'x' } }, 'local');
    });

    expect(onConnected).not.toHaveBeenCalled();
  });

  it('should_ignore_storage_changes_in_other_areas', async () => {
    sendMessageMock.mockImplementation((_msg: { type: string }, cb: (res: unknown) => void) => cb({ connected: true }));
    const onConnected = vi.fn();
    renderHook(() => useConnection({ onConnected }));

    act(() => {
      storageChangeListener?.({ extensionToken: { newValue: 'new-token' } }, 'sync');
    });

    expect(onConnected).not.toHaveBeenCalled();
  });

  it('should_remove_storage_listener_on_unmount', () => {
    const { unmount } = renderHook(() => useConnection());
    unmount();
    expect(chrome.storage.onChanged.removeListener).toHaveBeenCalled();
  });
});