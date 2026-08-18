import { describe, it, expect, vi, afterEach } from 'vitest';
import { analyzeJob, sendFeedback } from './api';
import type { AtsResult } from '../shared/types';

const ATS_RESULT: AtsResult = {
  heuristics: { checks: [], score: 80 },
  analysis: {
    score: 80,
    summary: 'Resumo',
    strengths: [],
    missingKeywords: [],
    recommendations: [],
    skillScores: [],
  },
  cached: false,
  courses: [],
};

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      status,
      ok: status >= 200 && status < 300,
      json: () => Promise.resolve(body),
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('analyzeJob', () => {
  it('should_map_401_to_NOT_CONNECTED', async () => {
    mockFetch(401, {});
    await expect(analyzeJob('token', 'vaga')).resolves.toEqual({ error: 'NOT_CONNECTED' });
  });

  it('should_map_429_to_RATE_LIMITED', async () => {
    mockFetch(429, {});
    await expect(analyzeJob('token', 'vaga')).resolves.toEqual({ error: 'RATE_LIMITED' });
  });

  it('should_map_400_to_NO_RESUME', async () => {
    mockFetch(400, {});
    await expect(analyzeJob('token', 'vaga')).resolves.toEqual({ error: 'NO_RESUME' });
  });

  it('should_propagate_backend_error_message_on_other_non_ok_status', async () => {
    mockFetch(500, { error: 'boom' });
    await expect(analyzeJob('token', 'vaga')).resolves.toEqual({ error: 'UNKNOWN', message: 'boom' });
  });

  it('should_return_Unknown_without_message_when_non_ok_status_has_no_error_field', async () => {
    mockFetch(500, { detail: 'server error' });
    const result = await analyzeJob('token', 'vaga');
    expect(result).toEqual({ error: 'UNKNOWN', message: undefined });
  });

  it('should_return_AtsResult_on_200_ok', async () => {
    mockFetch(200, ATS_RESULT);
    await expect(analyzeJob('token', 'vaga')).resolves.toEqual(ATS_RESULT);
  });

  it('should_include_jobTitle_in_request_body_when_provided', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve(ATS_RESULT),
    });
    vi.stubGlobal('fetch', fetchFn);

    await analyzeJob('token', 'vaga de React', 'Desenvolvedor React');

    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining('/api/extension/analyze'),
      expect.objectContaining({
        body: JSON.stringify({ jobDescription: 'vaga de React', jobTitle: 'Desenvolvedor React' }),
      }),
    );
  });

  it('should_send_undefined_jobTitle_when_not_provided', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve(ATS_RESULT),
    });
    vi.stubGlobal('fetch', fetchFn);

    await analyzeJob('token', 'vaga');

    expect(fetchFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ jobDescription: 'vaga', jobTitle: undefined }),
      }),
    );
  });

  it('should_return_UNKNOWN_with_message_when_network_fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    const result = await analyzeJob('token', 'vaga');
    expect(result).toEqual({ error: 'UNKNOWN', message: 'Failed to fetch' });
  });

  it('should_return_UNKNOWN_when_json_parse_fails_on_non-ok_response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 500,
        ok: false,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      }),
    );

    const result = await analyzeJob('token', 'vaga');
    expect(result).toEqual({ error: 'UNKNOWN', message: undefined });
  });

  it('should_send_Bearer_token_in_authorization_header', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve(ATS_RESULT),
    });
    vi.stubGlobal('fetch', fetchFn);

    await analyzeJob('my-token', 'vaga');

    expect(fetchFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer my-token' },
      }),
    );
  });
});

describe('sendFeedback', () => {
  it('should_map_401_to_NOT_CONNECTED', async () => {
    mockFetch(401, {});
    await expect(sendFeedback('token', true)).resolves.toEqual({ error: 'NOT_CONNECTED' });
  });

  it('should_return_ok_on_200', async () => {
    mockFetch(200, {});
    await expect(sendFeedback('token', true)).resolves.toEqual({ ok: true });
  });

  it('should_map_other_non_ok_status_to_UNKNOWN', async () => {
    mockFetch(500, { detail: 'server error' });
    await expect(sendFeedback('token', true)).resolves.toEqual({ error: 'UNKNOWN' });
  });

  it('should_include_comment_in_request_body_when_provided', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', fetchFn);

    await sendFeedback('token', false, 'Não foi útil');

    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining('/api/extension/feedback'),
      expect.objectContaining({
        body: JSON.stringify({ rating: false, comment: 'Não foi útil' }),
      }),
    );
  });

  it('should_send_Bearer_token_in_authorization_header', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', fetchFn);

    await sendFeedback('auth-token', true);

    expect(fetchFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer auth-token' },
      }),
    );
  });
});