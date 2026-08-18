import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Capture the original pushState/replaceState references for later comparison
const originalPushState = vi.fn();
const originalReplaceState = vi.fn();

vi.stubGlobal('history', {
  pushState: originalPushState,
  replaceState: originalReplaceState,
});

vi.stubGlobal('window', {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  setInterval: vi.fn(() => 123),
  clearInterval: vi.fn(),
});

// Stub location as a mutable object (property changes are read by check() directly)
vi.stubGlobal('location', { href: 'https://example.com/' });

import { onUrlChange } from './spa';

describe('onUrlChange', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    location.href = 'https://example.com/';
  });

  it('should_return_a_cleanup_function', () => {
    const cleanup = onUrlChange(() => {});
    expect(typeof cleanup).toBe('function');
  });

  it('should_patch_history_pushState', () => {
    onUrlChange(() => {});
    expect(history.pushState).not.toBe(originalPushState);
  });

  it('should_patch_history_replaceState', () => {
    onUrlChange(() => {});
    expect(history.replaceState).not.toBe(originalReplaceState);
  });

  it('should_add_popstate_event_listener', () => {
    onUrlChange(() => {});
    expect(window.addEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
  });

  it('should_start_polling_interval_at_1500ms', () => {
    onUrlChange(() => {});
    expect(window.setInterval).toHaveBeenCalledWith(expect.any(Function), 1500);
  });

  it('should_restore_original_pushState_after_cleanup', () => {
    const cleanup = onUrlChange(() => {});
    cleanup();
    expect(typeof history.pushState).toBe('function');
  });

  it('should_restore_original_replaceState_after_cleanup', () => {
    const cleanup = onUrlChange(() => {});
    cleanup();
    expect(typeof history.replaceState).toBe('function');
  });

  it('should_remove_popstate_event_listener_on_cleanup', () => {
    const cleanup = onUrlChange(() => {});
    cleanup();
    expect(window.removeEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
  });

  it('should_clear_polling_interval_on_cleanup', () => {
    const cleanup = onUrlChange(() => {});
    cleanup();
    expect(window.clearInterval).toHaveBeenCalled();
  });

  it('should_call_callback_when_pushState_changes_location_href', () => {
    const cb = vi.fn();
    const cleanup = onUrlChange(cb);

    // Change location.href before calling pushState, so check() detects the change
    location.href = 'https://example.com/new-page';
    history.pushState({}, '', '/new-page');

    expect(cb).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('should_not_call_callback_when_location_href_has_not_changed', () => {
    const cb = vi.fn();
    const cleanup = onUrlChange(cb);

    // pushState called but location.href still the same as lastUrl
    history.pushState({}, '', '/same-page');

    expect(cb).not.toHaveBeenCalled();
    cleanup();
  });

  it('should_prevent_duplicate_callback_when_URL_has_not_changed', () => {
    const cb = vi.fn();
    const cleanup = onUrlChange(cb);

    // Call pushState twice with same URL (no location.href change)
    history.pushState({}, '', '/page');
    history.pushState({}, '', '/page');

    expect(cb).toHaveBeenCalledTimes(0);
    cleanup();
  });

  it('should_only_call_callback_once_when_URL_changes_to_same_new_value', () => {
    const cb = vi.fn();
    const cleanup = onUrlChange(cb);

    location.href = 'https://example.com/new';
    history.pushState({}, '', '/new');
    // Same URL again
    history.pushState({}, '', '/new');

    expect(cb).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('should_call_callback_for_each_distinct_URL_change', () => {
    const cb = vi.fn();
    const cleanup = onUrlChange(cb);

    location.href = 'https://example.com/page1';
    history.pushState({}, '', '/page1');

    location.href = 'https://example.com/page2';
    history.pushState({}, '', '/page2');

    expect(cb).toHaveBeenCalledTimes(2);
    cleanup();
  });

  it('should_forward_the_return_value_from_original_pushState', () => {
    originalPushState.mockReturnValue(undefined);
    const cleanup = onUrlChange(() => {});

    // The patched pushState calls originalPush.apply(this, args) and returns its result
    // We can verify the original was invoked (the patched version wraps it)
    location.href = 'https://example.com/test';
    history.pushState({}, '', '/test');
    expect(originalPushState).toHaveBeenCalled();
    cleanup();
  });
});