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
    formattingIssues: [],
    recommendations: [],
    skillScores: [],
  },
  cached: false,
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
  it('maps 401 to NOT_CONNECTED', async () => {
    mockFetch(401, {});
    await expect(analyzeJob('token', 'vaga')).resolves.toEqual({ error: 'NOT_CONNECTED' });
  });

  it('maps 429 to RATE_LIMITED', async () => {
    mockFetch(429, {});
    await expect(analyzeJob('token', 'vaga')).resolves.toEqual({ error: 'RATE_LIMITED' });
  });

  it('maps 400 to NO_RESUME', async () => {
    mockFetch(400, {});
    await expect(analyzeJob('token', 'vaga')).resolves.toEqual({ error: 'NO_RESUME' });
  });

  it('propaga o erro do backend em outros status', async () => {
    mockFetch(500, { error: 'boom' });
    await expect(analyzeJob('token', 'vaga')).resolves.toEqual({ error: 'boom' });
  });

  it('retorna o AtsResult em 200', async () => {
    mockFetch(200, ATS_RESULT);
    await expect(analyzeJob('token', 'vaga')).resolves.toEqual(ATS_RESULT);
  });
});

describe('sendFeedback', () => {
  it('mapeia 401 para NOT_CONNECTED', async () => {
    mockFetch(401, {});
    await expect(sendFeedback('token', true)).resolves.toEqual({ error: 'NOT_CONNECTED' });
  });

  it('retorna ok em 200', async () => {
    mockFetch(200, {});
    await expect(sendFeedback('token', true)).resolves.toEqual({ ok: true });
  });
});