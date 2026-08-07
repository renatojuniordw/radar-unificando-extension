import { API_BASE } from './config';
import type {
  AnalyzeResponse,
  AtsResult,
  FeedbackResponse,
  RewriteResponse,
} from './types';

/** Cliente HTTP do backend. Cada método mapeia erros para códigos conhecidos. */

export async function analyzeJob(
  token: string,
  jobDescription: string,
): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_BASE}/extension/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ jobDescription }),
  });

  if (res.status === 401) return { error: 'NOT_CONNECTED' };

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 429) return { error: 'RATE_LIMITED' };
    if (res.status === 400) return { error: 'NO_RESUME' };
    return { error: (data as { error?: string }).error || 'UNKNOWN' };
  }
  return data as AtsResult;
}

export async function rewriteSection(
  token: string,
  section: string,
  jobDescription: string,
): Promise<RewriteResponse> {
  const res = await fetch(`${API_BASE}/extension/rewrite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ section, jobDescription }),
  });

  if (res.status === 401) return { error: 'NOT_CONNECTED' };

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: (data as { error?: string }).error || 'UNKNOWN' };
  }
  return data as { rewritten: string };
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