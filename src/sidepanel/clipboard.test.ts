import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyText } from './clipboard';

interface MockTextarea {
  value: string;
  style: { position?: string; opacity?: string };
  select: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
}

function createMockTextarea(): MockTextarea {
  return {
    value: '',
    style: {},
    select: vi.fn(),
    remove: vi.fn(),
  };
}

describe('copyText', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn(async () => {}),
      },
    });
    vi.stubGlobal('document', {
      createElement: vi.fn(() => createMockTextarea()),
      body: {
        appendChild: vi.fn(),
      },
      execCommand: vi.fn(() => true),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should_use_Clipboard_API_when_available_and_return_true', async () => {
    const result = await copyText('test text');
    expect(result).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text');
  });

  it('should_return_false_when_Clipboard_API_fails_and_execCommand_fails', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('not allowed'));
    (document.execCommand as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const result = await copyText('test text');
    expect(result).toBe(false);
  });

  it('should_use_fallback_when_Clipboard_API_throws', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('not allowed'));

    const result = await copyText('fallback text');
    expect(result).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('should_create_textarea_element_for_fallback', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('not allowed'));

    await copyText('test');
    expect(document.createElement).toHaveBeenCalledWith('textarea');
    expect(document.body.appendChild).toHaveBeenCalled();
  });

  it('should_set_textarea_value_and_select_it', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('not allowed'));
    const mockTextarea = createMockTextarea();
    (document.createElement as ReturnType<typeof vi.fn>).mockReturnValue(mockTextarea);

    await copyText('my text');
    expect(mockTextarea.value).toBe('my text');
    expect(mockTextarea.select).toHaveBeenCalled();
  });

  it('should_remove_textarea_after_copy', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('not allowed'));
    const mockTextarea = createMockTextarea();
    (document.createElement as ReturnType<typeof vi.fn>).mockReturnValue(mockTextarea);

    await copyText('test');
    expect(mockTextarea.remove).toHaveBeenCalled();
  });

  it('should_return_false_when_execCommand_throws_an_exception', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('not allowed'));
    (document.execCommand as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('execCommand not supported');
    });

    const result = await copyText('test');
    expect(result).toBe(false);
  });

  it('should_still_remove_textarea_when_execCommand_throws', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('not allowed'));
    const mockTextarea = createMockTextarea();
    (document.createElement as ReturnType<typeof vi.fn>).mockReturnValue(mockTextarea);
    (document.execCommand as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('execCommand not supported');
    });

    await copyText('test');
    expect(mockTextarea.remove).toHaveBeenCalled();
  });

  it('should_set_textarea_style_to_fixed_and_opacity_zero', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('not allowed'));
    const mockTextarea = createMockTextarea();
    (document.createElement as ReturnType<typeof vi.fn>).mockReturnValue(mockTextarea);

    await copyText('test');
    expect(mockTextarea.style.position).toBe('fixed');
    expect(mockTextarea.style.opacity).toBe('0');
  });
});