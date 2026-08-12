import { describe, it, expect } from 'vitest';
import { truncateUrl, errorMessage } from './utils';

describe('truncateUrl', () => {
  it('returns original url when shorter than max', () => {
    const url = 'https://example.com/job/123';
    expect(truncateUrl(url)).toBe(url);
  });

  it('truncates url when longer than default max (60)', () => {
    const url = 'https://www.linkedin.com/jobs/view/desenvolvedor-react-senior-na-empresa-ficticia-1234567890';
    const result = truncateUrl(url);
    expect(result.length).toBeLessThanOrEqual(62); // 60 + ellipsis
    expect(result.endsWith('…')).toBe(true);
  });

  it('truncates url when longer than custom max', () => {
    const url = 'https://example.com/very/long/path';
    const result = truncateUrl(url, 20);
    expect(result.length).toBeLessThanOrEqual(22); // 20 + ellipsis
    expect(result.endsWith('…')).toBe(true);
  });

  it('returns original url when exactly at max', () => {
    const url = 'a'.repeat(60);
    expect(truncateUrl(url)).toBe(url);
  });

  it('handles empty string', () => {
    expect(truncateUrl('')).toBe('');
  });
});

describe('errorMessage', () => {
  it('returns connection error for NOT_CONNECTED', () => {
    const msg = errorMessage('NOT_CONNECTED');
    expect(msg).toContain('Conectar');
  });

  it('returns resume error for NO_RESUME', () => {
    const msg = errorMessage('NO_RESUME');
    expect(msg).toContain('currículo');
  });

  it('returns rate limit error for RATE_LIMITED', () => {
    const msg = errorMessage('RATE_LIMITED');
    expect(msg).toContain('Aguarde');
  });

  it('returns text error for NO_TEXT', () => {
    const msg = errorMessage('NO_TEXT');
    expect(msg).toContain('texto');
  });

  it('returns generic error for UNKNOWN without detail', () => {
    const msg = errorMessage('UNKNOWN');
    expect(msg).toContain('Não foi possível analisar');
    expect(msg).not.toContain(':');
  });

  it('returns error with detail for UNKNOWN with detail', () => {
    const msg = errorMessage('UNKNOWN', 'Connection timeout');
    expect(msg).toContain('Connection timeout');
  });
});
