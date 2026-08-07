import { describe, it, expect } from 'vitest';
import { pickLargestTextBlock, MAX_JOB_DESCRIPTION } from './extract';

describe('pickLargestTextBlock', () => {
  it('should_return_the_longest_block', () => {
    expect(pickLargestTextBlock(['curto', 'um texto bem mais longo aqui', 'médio'])).toBe(
      'um texto bem mais longo aqui'
    );
  });

  it('should_return_empty_when_no_blocks', () => {
    expect(pickLargestTextBlock([])).toBe('');
  });

  it('should_trim_blocks', () => {
    expect(pickLargestTextBlock(['  x  ', '   abc   '])).toBe('abc');
  });
});

describe('MAX_JOB_DESCRIPTION', () => {
  it('should_be_8000', () => {
    expect(MAX_JOB_DESCRIPTION).toBe(8000);
  });
});