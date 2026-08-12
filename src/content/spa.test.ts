import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stub history before importing the module
const mockPushState = vi.fn();
const mockReplaceState = vi.fn();

vi.stubGlobal('history', {
  pushState: mockPushState,
  replaceState: mockReplaceState,
});

vi.stubGlobal('window', {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  setInterval: vi.fn(() => 123),
  clearInterval: vi.fn(),
});

vi.stubGlobal('location', { href: 'https://example.com/' });

import { onUrlChange } from './spa';

describe('onUrlChange', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a cleanup function', () => {
    const cleanup = onUrlChange(() => {});
    expect(typeof cleanup).toBe('function');
  });

  it('patches history.pushState', () => {
    onUrlChange(() => {});
    expect(mockPushState).toBeDefined();
  });

  it('patches history.replaceState', () => {
    onUrlChange(() => {});
    expect(mockReplaceState).toBeDefined();
  });

  it('adds popstate event listener', () => {
    onUrlChange(() => {});
    expect(window.addEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
  });

  it('starts polling interval', () => {
    onUrlChange(() => {});
    expect(window.setInterval).toHaveBeenCalledWith(expect.any(Function), 1500);
  });

  it('cleanup restores original functions', () => {
    const cleanup = onUrlChange(() => {});
    cleanup();
    expect(window.removeEventListener).toHaveBeenCalled();
    expect(window.clearInterval).toHaveBeenCalled();
  });
});
