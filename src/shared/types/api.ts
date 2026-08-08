import type { AtsResult } from './domain';

/** Contrato dos endpoints /api/extension/*. */

/** Resposta do endpoint /api/extension/analyze. */
export type AnalyzeResponse = AtsResult | { error: string };

export type AnalyzeErrorCode =
  | 'NOT_CONNECTED'
  | 'NO_TEXT'
  | 'NO_RESUME'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

/** Resposta do /api/extension/feedback. */
export type FeedbackResponse = { ok: true } | { error: string };