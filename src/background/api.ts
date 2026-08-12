import { API_BASE } from '../shared/config';
import type { AnalyzeResponse, AtsResult, FeedbackResponse } from '../shared/types';

/** Cliente HTTP do backend. Cada método mapeia erros para códigos conhecidos. */

export async function analyzeJob(
  token: string,
  jobDescription: string,
  jobTitle?: string,
): Promise<AnalyzeResponse> {
  const url = `${API_BASE}/extension/analyze`;
  console.log('[radar-ext] analyzeJob: enviando requisição', {
    url,
    jobTitle,
    jobDescriptionLength: jobDescription.length,
    hasToken: Boolean(token),
  });

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ jobDescription, jobTitle }),
    });
  } catch (err) {
    console.error('[radar-ext] analyzeJob: falha de rede/fetch', err);
    return { error: 'UNKNOWN', message: err instanceof Error ? err.message : String(err) };
  }

  console.log('[radar-ext] analyzeJob: resposta recebida', { status: res.status, ok: res.ok });

  if (res.status === 401) return { error: 'NOT_CONNECTED' };

  const data = await res.json().catch((err) => {
    console.error('[radar-ext] analyzeJob: falha ao parsear JSON da resposta', err);
    return {};
  });

  if (!res.ok) {
    console.error('[radar-ext] analyzeJob: resposta com erro', { status: res.status, data });
    if (res.status === 429) return { error: 'RATE_LIMITED' };
    if (res.status === 400) return { error: 'NO_RESUME' };
    return { error: 'UNKNOWN', message: (data as { error?: string }).error };
  }
  console.log('[radar-ext] analyzeJob: sucesso', { score: (data as AtsResult)?.analysis?.score });
  return data as AtsResult;
}

export async function sendFeedback(
  token: string,
  rating: boolean,
  comment?: string,
): Promise<FeedbackResponse> {
  const res = await fetch(`${API_BASE}/extension/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ rating, comment }),
  });

  if (res.status === 401) return { error: 'NOT_CONNECTED' };
  if (!res.ok) return { error: 'UNKNOWN' };
  return { ok: true };
}