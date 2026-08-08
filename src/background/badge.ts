const GREEN = '#16a34a';
const YELLOW = '#ca8a04';
const RED = '#dc2626';

function colorForScore(score: number): string {
  if (score >= 70) return GREEN;
  if (score >= 40) return YELLOW;
  return RED;
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