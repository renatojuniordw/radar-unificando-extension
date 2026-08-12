import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyText } from './clipboard';

describe('copyText', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn(async () => {}),
      },
    });
    vi.stubGlobal('document', {
      createElement: vi.fn(() => ({
        value: '',
        style: {},
        select: vi.fn(),
        remove: vi.fn(),
      })),
      body: {
        appendChild: vi.fn(),
      },
      execCommand: vi.fn(() => true),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses Clipboard API when available and returns true', async () => {
    const result = await copyText('test text');
    expect(result).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text');
  });

  it('returns false when Clipboard API fails and execCommand fails', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('not allowed'));
    (document.execCommand as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const result = await copyText('test text');
    expect(result).toBe(false);
  });

  it('uses fallback when Clipboard API throws', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('not allowed'));

    const result = await copyText('fallback text');
    expect(result).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('creates textarea element for fallback', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('not allowed'));

    await copyText('test');
    expect(document.createElement).toHaveBeenCalledWith('textarea');
    expect(document.body.appendChild).toHaveBeenCalled();
  });
});
