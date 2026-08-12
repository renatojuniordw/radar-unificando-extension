import { BADGE_COLORS } from '../shared/config';

function colorForScore(score: number): string {
  if (score >= 70) return BADGE_COLORS.GOOD;
  if (score >= 40) return BADGE_COLORS.WARNING;
  return BADGE_COLORS.BAD;
}

/** Mostra o score da última análise no ícone da extensão. */
export async function setScoreBadge(score: number): Promise<void> {
  await chrome.action.setBadgeText({ text: String(score) });
  await chrome.action.setBadgeBackgroundColor({ color: colorForScore(score) });
}

/** Remove o badge do ícone. */
export async function clearBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '' });
}